from django.http import HttpResponse
from django.shortcuts import render
import json
import requests
import pymongo
from datetime import datetime
import numpy as np
import functools 

client = pymongo.MongoClient('mongodb://localhost:27017')
database = client['trollcheck']
bearer_token = "AAAAAAAAAAAAAAAAAAAAABkYNgEAAAAA9gybLao9r2LyuBNHAOGDlOOivS0%3DOF9mpuGxGjJTiF1T151P5XOKHg0sAnnj05TUBbHM3VZrkv9UaS"

def home(request):
	context = {
        ## This is a dict for templating 
		# 'site_name' => 'TrollCheck'
	}
	return render(request, 'index.html', context=context)

def find_peaks(history, metric):

	windows = []
	done = False
	window_start = 0
	window_end = 1
	while not done: #split the history into 7-days windows
		start = datetime.fromtimestamp(history[window_start]['ts'])
		while window_end < len(history)-1 and (datetime.fromtimestamp(history[window_end]['ts']) - start).days < 7:
			window_end += 1

		if window_end - window_start >= 4: #ignore windows that have too few points, might not be the best thing to do tho
			windows.append((window_start, window_end))
		window_start = window_end 
		window_end = window_start + 1
		if window_end >= len(history) - 1:
			done = True
	
	print(windows)

	deltas = []
	for (s,e) in windows: #compute how the 'derivative' changes between the start of the window and the end
		delta_s = (history[s+1]['details'][metric] - history[s]['details'][metric]) / (history[s+1]['ts']-history[s]['ts'] +0.00000001)#this is just to avoid div-by-0
		delta_e = (history[e]['details'][metric] - history[e-1]['details'][metric]) / (history[e]['ts']-history[e-1]['ts']+0.00000001)
		deltas.append(abs(delta_e-delta_s))
	print(deltas)

	peaks_ts = []
	for i in range(10):
		j = np.argmax(deltas)
		print(datetime.fromtimestamp(history[(windows[j][0])]['ts']))
		deltas[j] = 0
		peaks_ts.append(history[(windows[j][0])]['ts'])
	return peaks_ts

def user(request, usr_id):
	user = database.get_collection("users").find_one({ "_id": usr_id })
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
		pp_url = details['profile_image_url_https'].replace("_normal", "")
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

		peaks = find_peaks(user['history'], 'followers_count')
		tweets = list(database.get_collection("tweets").find({"user_id": user['details']['id_str']}))
		

		suspect_tweets = []
		for p in peaks:
			t = [] #TODO: Take like 10 tweets instead of just 1
			t.append(functools.reduce(lambda a, b : a if abs(a['ts']-p) < abs(b['ts']-p) else b, tweets))
			suspect_tweets.append(t)
		

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
			'tweets': suspect_tweets,
			'peaks': peaks,
		}
		return render(request, 'user.html', context=context)
	return HttpResponse("User not found :(")