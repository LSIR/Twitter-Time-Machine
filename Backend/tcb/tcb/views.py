from django.http import HttpResponse
from django.http import JsonResponse
from django.shortcuts import render
import json
import requests
import pymongo
from datetime import datetime
import functools 
from . import analysis
from functools import reduce
import re
import pandas as pd

token = 0
try:
	from .config import *
	token = bearer_token
except:
	print("No token available for Twitter API, are you sure that you created the config.py file containing bearer_token ?")


client = pymongo.MongoClient('mongodb://localhost:27017')
database = client['trollcheck']
autocomplete_limit = 10

retweeted_tag_regex = re.compile(r'RT \@\w+')
related_tag_regex = re.compile(r'\@\w+')
hash_tag_regex = re.compile(r'\#\w+')

def home(request):
	context = {
        ## This is a dict for templating 
		# 'site_name' => 'TrollCheck'
	}
	return render(request, 'index.html', context=context)

def user(request, usr_id):
	if usr_id[0] == "*":
		user = database.get_collection("users").find_one({ "details.id": int(usr_id[1:]) })
	else:
		user = database.get_collection("users").find_one({ "_id": usr_id.lower() })
	if not user is None:
		details = user['details']

		# Load user info from database : 
		name = details['name']
		screen_name = details['screen_name']
		location = details['location']
		tweet_count = details['statuses_count']
		following_count = details['friends_count']
		followers_count = details['followers_count']
		likes_count = details['favourites_count']
		bio = details['description']
		pp_url = details['img'].replace("_normal", "")
		url = details['url']
		banned = False

		# Get updated informations from twitter API
		headers = {"Authorization": "Bearer {}".format(token)}
		url = "https://api.twitter.com/1.1/users/show.json?user_id={}".format(details["id"])
		user_request =  requests.request("GET", url, headers=headers)

		if(user_request.status_code == 200):
			print("Twitter API user info request : status OK (200)")
			user_infos = user_request.json()

			name = user_infos['name']
			screen_name = user_infos['screen_name']
			location = user_infos['location']
			tweet_count = user_infos['statuses_count']
			following_count = user_infos['friends_count']
			followers_count = user_infos['followers_count']
			likes_count = user_infos['favourites_count']
			bio = user_infos['description']
			pp_url = user_infos['profile_image_url_https'].replace("_normal", "")
			url = user_infos['url']
		else:
			banned = True
			print("Twitter API user info request error: code {}".format(user_request.status_code))

		print("Sorting History...")
		user['history'] = sorted(user['history'], key=lambda x: x['ts'])
		print("Done")
		tweets_metadata = list(database.get_collection("tweets").find({"user_id": details['id']}, {'_id': False, 'user_id': False}))

		# Remove duplicate tweets
		print(tweets_metadata)
		tweets_metadata = pd.DataFrame(tweets_metadata)
		temp_tweets = tweets_metadata.copy().groupby("text").last().reset_index().drop(columns=["ts"])
		timestamps = tweets_metadata.copy()[["text", "ts"]].groupby("text").first().reset_index()
		deleted = tweets_metadata[tweets_metadata.deleted == True]
		tweets_metadata = temp_tweets.merge(timestamps, on="text")
		tweets_metadata = pd.concat([tweets_metadata, deleted], axis=0)
		tweets_metadata = tweets_metadata.fillna("")
		
		tweets_metadata = tweets_metadata.to_dict('records')

		rt_count = 0
		tw_count = 0
		re_count = 0

		retweeted_users = {}
		related_users = {}
		hashtags = {}
		for t in tweets_metadata:
			if 'text' in t:
				txt = t["text"]
				if txt.startswith("RT"):
					rt_count += 1
				elif txt.startswith("@"):
					re_count += 1
				else:
					tw_count += 1
				# First add users in retweeted
				for usr in re.findall(retweeted_tag_regex, txt):
					usr = usr.lower()[3:] # to remove rt from the text
					if not usr in retweeted_users:
						retweeted_users[usr] = 0
					retweeted_users[usr] += 1
				# Then add in related if not retweeted
				for usr in re.findall(related_tag_regex, txt):
					usr = usr.lower()
					if not usr in related_users and not usr in retweeted_users:
						related_users[usr] = 0
					if not usr in retweeted_users:
						related_users[usr] += 1
				for h in re.findall(hash_tag_regex, txt):
					if not h in hashtags:
						hashtags[h] = 0
					hashtags[h] += 1

				#del(t["text"]) #avoid transfering the text over the network
		
		(peaks, max_slope, avg_slope) = analysis.find_peaks(user['history'], 'followers_count')



		hashtags = list(sorted(hashtags.items(), key=lambda item: item[1], reverse=True))
		related_users = list(sorted(related_users.items(), key=lambda item: item[1], reverse=True))
		related_users = [u for u in related_users if u[0] not in retweeted_users.keys()] # keep only users in retweeted
		retweeted_users = list(sorted(retweeted_users.items(), key=lambda item: item[1], reverse=True))
		context = {
			'name': name,
			'username': screen_name,
			'location': location,
			'tweet_count': tweet_count,
			'following_count': following_count,
			'followers_count': followers_count,
			'likes_count': likes_count,
			'bio': bio,
			'pp_url': pp_url,
			'history': json.dumps(user['history']),
			'url': details['url'],
			'created_at': datetime.strptime(details['created_at'], '%a %b %d %X %z %Y').strftime("%a %b %d %Y at %X"),
			'verified': '<i rel="tooltip" title="Verified account" class="bi bi-check2-circle"></i>' if details['verified'] else '<i rel="tooltip" title="Unverified account" class="bi bi-slash-circle"></i>',
			'protected': '<i rel="tooltip" title="Protected account" class="bi bi-lock-fill"></i>' if details['protected'] else '<i rel="tooltip" title="Unprotected account" class="bi bi-unlock-fill"></i>',
			'peaks': peaks,
			'avg_growth': (int)(avg_slope * (24*60*60)),
			'max_growth': (int)(max_slope * (24*60*60)),
			'screen_names': json.dumps(user['screen_names']),
			'names': json.dumps(user['names']),
			'descriptions': json.dumps(user['descriptions']),
			'tweets_metadata': json.dumps(tweets_metadata),
			'tw_cnt': tw_count,
			'rt_cnt': rt_count,
			're_cnt': re_count,
			'retweeted_users': json.dumps(retweeted_users),
			'related_users': json.dumps(related_users),
			'hashtags': json.dumps(hashtags),
			'isBanned': banned
		}
		return render(request, 'user.html', context=context)

	print(type(usr_id))
	return render(request, 'user_not_found.html', context={"user":usr_id})

def tweets(request, usr_id):
	dt = (3*24*60*60)
	user = database.get_collection("users").find_one({ "_id": usr_id.lower() })
	if not user is None:
		uuid = user['details']['id']
		print(uuid)
		tweets = database.get_collection('tweets').find({'user_id': uuid})
		tweets_no_id = list(map(lambda x: {i:x[i] for i in x if i!='_id'}, tweets))
		if 'ts' in request.GET:
			target_ts = int(request.GET['ts'])
			tweets_no_id = list(filter(lambda x: 'ts' in x and int(x['ts']) > target_ts-dt and int(x['ts']) < target_ts+dt, tweets_no_id))
		return JsonResponse(tweets_no_id, safe=False)
	return render(request, 'user_not_found.html')


def autocomplete(request, username):

	users = database.get_collection("users").find({ "_id": {"$regex": "^" + username + ".*"}}, {"_id":1}).sort([("details.followers_count", -1)]).limit(autocomplete_limit)

	return JsonResponse(list(users), safe=False)

def user_data(request, usr_id):
	return JsonResponse(database.get_collection("users").find_one({ "_id": usr_id.lower() }))

def tweet_data(request, usr_id):
	user = database.get_collection("users").find_one({ "_id": usr_id.lower() })
	if not user is None:
		uuid = user['details']['id']
		print(uuid)
		tweets = database.get_collection('tweets').find({'user_id': uuid})
		tweets_no_id = list(map(lambda x: {i:x[i] for i in x if i!='_id'}, tweets))
		return JsonResponse(tweets_no_id, safe=False)
	return JsonResponse([])
