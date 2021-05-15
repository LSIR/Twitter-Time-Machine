from django.http import HttpResponse
from django.http import JsonResponse
from django.shortcuts import render
import json
import requests
import pymongo
from datetime import datetime
import functools 
from . import analysis


client = pymongo.MongoClient('mongodb://localhost:27017')
database = client['trollcheck']
bearer_token = "AAAAAAAAAAAAAAAAAAAAABkYNgEAAAAA9gybLao9r2LyuBNHAOGDlOOivS0%3DOF9mpuGxGjJTiF1T151P5XOKHg0sAnnj05TUBbHM3VZrkv9UaS"

def home(request):
	context = {
        ## This is a dict for templating 
		# 'site_name' => 'TrollCheck'
	}
	return render(request, 'index.html', context=context)



def user(request, usr_id):
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

		# Get updated informations from twitter API
		headers = {"Authorization": "Bearer {}".format(bearer_token)}
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
			print("Twitter API user info request error: code {}".format(user_request.status_code))

		print("Sorting History...")
		user['history'] = sorted(user['history'], key=lambda x: x['ts'])
		print("Done")
		tweets_metadata = list(database.get_collection("tweets").find({"user_id": details['id']}, {'_id': False, 'text': False, 'user_id': False}))
		(peaks, max_slope, avg_slope) = analysis.find_peaks(user['history'], 'followers_count')
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
			'tweets_metadata': json.dumps(tweets_metadata)
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
			tweets_no_id = list(filter(lambda x: 'ts' in x and x['ts'] > target_ts-dt and x['ts'] < target_ts+dt, tweets_no_id))
		return JsonResponse(tweets_no_id, safe=False)
	return render(request, 'user_not_found.html')