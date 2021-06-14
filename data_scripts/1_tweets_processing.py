import pandas as pd
import numpy as np
import os
from os import listdir
import sys
import json
import gzip

def filter_relevant_historical_data(user):
    f = {}
    f['followers_count'] = user['followers_count']
    f['friends_count'] = user['friends_count']
    f['favourites_count'] = user['favourites_count']
    f['statuses_count'] = user['statuses_count']
    return f

def filter_relevant_historical_change_data(user):
    f = {}
    f["screen_name"] = user["screen_name"]
    f["name"] = user["name"]
    f["description"] = user["description"]
    f["img"] = user["profile_image_url"]
    f["location"] = user["location"]
    f["url"] = user["url"]
    return f

def history_delta(users, attribute, user, user_id, tweet_ts):
    # For a given attribute name (eg. : screen_name), check if it changed and append if true
    history_name = attribute+"s"

    new_attribute = user[attribute]

    if not history_name in users[user_id]:
            users[user_id][history_name] = [{attribute:new_attribute, "ts":tweet_ts}]

    if (len(users[user_id][history_name]) > 0) and (users[user_id][history_name][-1][attribute] != new_attribute) \
        and (users[user_id][history_name][-1]["ts"] < tweet_ts):
        users[user_id][history_name].append({attribute:new_attribute, "ts":tweet_ts})


def process_user(users, user, tweet_ts):
    user_id = user["id"]
    if not user_id in users:
        users[user_id] = {}
    if not "details" in users[user_id] or (users[user_id]['details']['ts'] < tweet_ts):
        users[user_id]['details'] = {}
        users[user_id]['details']["id"] = user["id"]
        users[user_id]['details']["created_at"] = user["created_at"]
        users[user_id]['details']["screen_name"] = user["screen_name"]
        users[user_id]['details']["name"] = user["name"]
        users[user_id]['details']["description"] = user["description"]
        users[user_id]['details']["followers_count"] = user["followers_count"]
        users[user_id]['details']["statuses_count"] = user["statuses_count"]
        users[user_id]['details']["friends_count"] = user["friends_count"]
        users[user_id]['details']["favourites_count"] = user["favourites_count"]
        users[user_id]['details']["following"] = user["following"]
        users[user_id]['details']["img"] = user["profile_image_url"]
        users[user_id]['details']["verified"] = user["verified"]
        users[user_id]['details']["listed_count"] = user["listed_count"]
        users[user_id]['details']["location"] = user["location"]
        users[user_id]['details']["protected"] = user["protected"]
        users[user_id]['details']["url"] = user["url"]
        users[user_id]['details']["ts"] = tweet_ts

    if not 'history' in users[user_id]:
            users[user_id]['history'] = []
    users[user_id]['history'].append({'details': filter_relevant_historical_data(user), 'ts': tweet_ts})

    # For the attributes that rarely change
    history_delta(users, "screen_name", user, user_id, tweet_ts)
    history_delta(users, "name", user, user_id, tweet_ts)
    history_delta(users, "description", user, user_id, tweet_ts)
    history_delta(users, "profile_image_url", user, user_id, tweet_ts)
    history_delta(users, "location", user, user_id, tweet_ts)
    history_delta(users, "url", user, user_id, tweet_ts)

    if not "_id" in users[user_id]:
        users[user_id]["_id"] = 0
    # Use latest screen_name as id for search by name on the website
    users[user_id]["_id"] = user["screen_name"].lower()

def parse_delete(tweet):
    """Function that parses the given (deleted) tweet"""
    tweet_p = {}
    for k in tweet.keys():
        if k == "status":
            for k2 in tweet["status"].keys():
                if k2 in ["id", "user_id"]:
                    tweet_p[k2] = tweet[k][k2]
        if k == "timestamp_ms":
            tweet_p["ts"] = tweet[k]
    
    tweet_p["deleted"] = True

    return tweet_p
    
def strip_tweet(tweets, tweets_ids, users, row, tweet_ts, deleted, active_users=None):
    """Function to remove unnecessary fields in the tweets and get the correct format for the tweets and users"""
    
    tweet = {}
    tweet_id = 0
        
    if not deleted:

        user_id = row["user"]["id"]

        # go on if active_users is None (process all the data) or if user_id  is in the subset of users
        if active_users == None or user_id in active_users:

            tweet_id = row["id"]
            
            tweet["ts"] = int(tweet_ts)
            tweet["id"] = int(tweet_id)
            tweet["created_at"] = str(row["created_at"]) # not the same as ts in the case of retweet or quotation
            tweet["text"] = row["text"]

            # retweet count not always available
            if "retweet_count" in row:
                tweet["retweet_count"] = row["retweet_count"]
            else:
                tweet["retweet_count"] = 0

            # favorite count not always available
            if "favorite_count" in row:
                tweet["favorite_count"] = row["favorite_count"]
            else:
                tweet["favorite_count"] = 0

            tweet["source"] = row["source"]
            tweet["user_id"] = user_id
            tweet["deleted"] = False

            process_user(users, row["user"], tweet_ts)

            ## If it's a RT, we need to add the OP's infos, we must check that it's not NaN because pandas puts NaN sometimes instead of leaving empty
            if 'retweeted_status' in row and not pd.isna(row['retweeted_status']):
                strip_tweet(tweets, tweets_ids, users, row['retweeted_status'], tweet_ts, False, active_users) #We pass the original timestamp

            ## Again with quotations
            if 'quoted_status' in row and not pd.isna(row['quoted_status']):
                strip_tweet(tweets, tweets_ids, users, row['quoted_status'], tweet_ts, False, active_users)

            if not tweet_id in tweets_ids:
                tweets_ids.add(tweet_id)
                tweets.append(tweet)
                    
    else:
        delete = row["delete"]
        user_id = delete["status"]["user_id"]

        if user_id in active_users:
                
            tweet = parse_delete(delete)
            tweet_id = tweet["id"]
            
            if not tweet_id in tweets_ids:
                tweets_ids.add(tweet_id)
                tweets.append(tweet)


active_users = set(pd.read_csv("active_users_2020_12.csv")["user_id"])

# default path of the data (month)
path = "2011/09/"
year = "2011"
month = "09"


# Parse command line arguments to get thread info
if(len(sys.argv) > 1):
    try:
        year =  sys.argv[1]
        month = sys.argv[2]
        path = year + "/" + month + "/"

        print("Processing data from year {}, month {}".format(year, month))
    except:
        print("Argument not recognized, trying default path /2011/09/")

else:
    print("No path given, trying default path /2011/09/")

for d in listdir(path): # day of the month
    print("Starting day : " + d)
    d_path = path + "/" + d + "/"

    tweets_ids = set()
    tweets = []
    users = {}

    for h in listdir(d_path): # hours of the day
        print("   Hour : " + h)
        h_path = d_path + "/" + h + "/"
        for m in listdir(h_path): # minutes of the hour
            m_path = h_path + "/" + m
            
            df = 0
            try:
                df = pd.read_json(m_path, lines=True)
            except:
                print("Error : couldn't read file " + m)
                continue

            df.dropna(how="all", inplace=True)

            df = df.drop(columns=["entities", "place", "in_reply_to_screen_name", "truncated", "in_reply_to_status_id_str",\
                                    "favorited", "in_reply_to_user_id_str", "id_str", "coordinates", "geo", "contributors",\
                                    "in_reply_to_user_id", "retweeted", "in_reply_to_status_id", "possibly_sensitive", "possibly_sensitive_editable"], errors="ignore")


            for index, row in df.iterrows():
                if 'delete' in row:
                    if pd.isna(row['delete']):
                        strip_tweet(tweets, tweets_ids, users, row, row['created_at'].timestamp(), False, active_users) #We pass the high-level ts because of RT & Quotes
                    else:
                        strip_tweet(tweets, tweets_ids, users, row, 0, True, active_users)

    # Save file for each day
    # sources : https://stackoverflow.com/questions/39450065/python-3-read-write-compressed-json-objects-from-to-gzip-file
    #          https://stackoverflow.com/questions/12517451/automatically-creating-directories-with-file-output

    user_array = list(users.values())
    user_path = "processed_data/" + year + "/" + month + "/users/"
    # Create directories if don't exists 
    os.makedirs(os.path.dirname(user_path), exist_ok=True)
    with gzip.open(user_path + "users_"+ year + "_" + month + "_" + d + ".json.gz", 'wt', encoding='UTF-8') as f:
        json.dump(user_array, f)

    tweet_path = "processed_data/" + year + "/" + month + "/tweets/"
    # Create directories if don't exists 
    os.makedirs(os.path.dirname(tweet_path), exist_ok=True)
    with gzip.open(tweet_path + "tweets_"+ year + "_" + month + "_" + d + ".json.gz", 'wt', encoding='UTF-8') as f:
        json.dump(tweets, f)