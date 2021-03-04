from django.http import HttpResponse
from django.shortcuts import render
import json
import pymongo
from datetime import datetime

client = pymongo.MongoClient('mongodb://localhost:27017')
database = client['trollcheck']

def home(request):
	context = {
        ## This is a dict for templating 
		# 'site_name' => 'TrollCheck'
	}
	return render(request, 'index.html', context=context)

def user(request, usr_id):
	user = database.get_collection("users").find_one({ "_id": usr_id })
	if not user is None:
		details = user['details']
		context = {
			'name': details['name'],
			'username': details['screen_name'],
			'location': details['location'],
			'tweet_count': details['statuses_count'],
			'following_count': details['friends_count'],
			'followers_count': details['followers_count'],
			'likes_count': details['favourites_count'],
			'bio': details['description'],
			'pp_url': details['profile_image_url_https'],
			'history': json.dumps(user['history']),
			'url': details['url'],
			'created_at': datetime.strptime(details['created_at'], '%a %b %d %X %z %Y').strftime("%a %b %d %Y at %X"),
			'verified': '<i rel="tooltip" title="Verified account" class="bi bi-check2-circle"></i>' if details['verified'] else '<i rel="tooltip" title="Unverified account" class="bi bi-slash-circle"></i>',
			'protected': '<i rel="tooltip" title="Protected account" class="bi bi-lock-fill"></i>' if details['protected'] else '<i rel="tooltip" title="Unprotected account" class="bi bi-unlock-fill"></i>',
			#'tweets': user['tweets']
		}
		return render(request, 'user.html', context=context)
	return HttpResponse("User not found :(")