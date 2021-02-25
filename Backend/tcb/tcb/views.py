from django.http import HttpResponse
from django.shortcuts import render

def home(request):
	context = {
        ## This is a dict for templating 
		# 'site_name' => 'TrollCheck'
	}
	return render(request, 'index.html', context=context)

def user(request, usr_id):
	context = {
        #TODO: Fill in the with the data we have
		'name': 'Mario',
		'username': 'SuperMario64',
		'location': 'Italy or Japan',
		'tweet_count': 321432,
		'following_count': 213,
		'followers_count': 438294329,
		'likes_count': 3217,
		'bio': 'Blablabla Princess in other castle',
	}
	return render(request, 'user.html', context=context)