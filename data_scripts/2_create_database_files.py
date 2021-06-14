import pandas as pd
import numpy as np
from os import listdir
import sys
import json
import gzip

# Read the list of active users
active_users = list(pd.read_csv("active_users_2020_12.csv")["user_id"])

# Path of the data (month)
data = "processed_data/"

# default number of chunks to divide the users into subfiles
n_chunks = 100
chunk_steps0 = 0
chunk_steps1 = 102

# Parse command line arguments to get chunks size
if(len(sys.argv) > 1):
    try:
        n_chunks =  int(sys.argv[1])
        chunk_steps0 = int(sys.argv[2])
        chunk_steps1 = int(sys.argv[3])

        print("Dividing processing of users into {} chunks".format(n_chunks))
    except:
        print("Argument not recognized, using default number of chunks : {}".format(n_chunks))

else:
    print("No arguments given, using default number of chunks : {}".format(n_chunks))



# https://stackoverflow.com/questions/312443/how-do-you-split-a-list-into-evenly-sized-chunks
def chunks(lst, n):
    """Yield successive n-sized chunks from lst."""
    for i in range(0, len(lst), n):
        yield lst[i:i + n]

def merge_users(chunk_users, users, new_users):
    """Function that merges user data for each day into a single dictionnary containing all the data (for all years) of the users""" 
    for u in new_users:
        user_id = u["details"]["id"]
        if user_id in chunk_users:
            if not user_id in users:
                users[user_id] = u
            else:
                if(u["details"]["ts"] > users[user_id]["details"]["ts"]):
                    users[user_id]["details"] = u["details"]
                    users[user_id]["_id"] = u["details"]["screen_name"].lower()

                history = users[user_id]["history"]
                if(history is not None and u["history"] is not None):
                    users[user_id]["history"] = history + u["history"]
                else:
                    users[user_id]["history"] = u["history"]

                def append_attributes(users, u, user_id, attribute_name):
                    attribute = users[user_id][attribute_name+"s"]
                    n_attribute = u[attribute_name+"s"]
                    if attribute is not None and n_attribute is not None:
                        if attribute[-1][attribute_name] != n_attribute[0][attribute_name]: # check if change in attribute
                            users[user_id][attribute_name+"s"] = attribute + n_attribute
                    else:
                        users[user_id][attribute_name+"s"] = n_attribute

                # screen_names
                append_attributes(users, u, user_id, "screen_name")

                # names
                append_attributes(users, u, user_id, "name")

                # descriptions
                append_attributes(users, u, user_id, "description")

                # profile_image_urls
                append_attributes(users, u, user_id, "profile_image_url")

                # locations
                append_attributes(users, u, user_id, "location")

                # urls
                append_attributes(users, u, user_id, "url")


all_chunks = list(enumerate(chunks(active_users, int(len(active_users)/n_chunks))))

if(chunk_steps1 >= 99):
    # To make sure to go through all the data
    chunk_steps1 = len(all_chunks)

print("Processing chunks from {} to {}".format(chunk_steps0, chunk_steps1))

for i, chunk_users in all_chunks[chunk_steps0:chunk_steps1]: # map to list and indexing to run it in parallel
    chunk_users = set(chunk_users) # cast for efficient test of existence
    print("Starting chunk no {} of {}".format(i+1, n_chunks))

    users = {}
    tweets = []

    for year in listdir(data):
        print("  Year {} :".format(year))
        y_path = data+year+"/"

        for month in listdir(y_path) :
            print("     Month {}".format(month))
            m_path = y_path+"/"+month+"/"

            # process users
            print("       Processing users : ")
            for day_u in listdir(m_path+"users/"):
                d_path = m_path+"users/"+day_u
                data_users = 0
                try:
                    with gzip.open(d_path) as f:
                        data_users = json.loads(f.read().decode('utf-8'))

                    merge_users(chunk_users, users, data_users)

                except:
                    print("Error with file " + day_u)
                    continue
            
            # process tweets
            print("       Processing tweets : ")
            for day_t in listdir(m_path+"tweets/"):
                d_path = m_path+"tweets/"+day_t
                data_tweets = 0
                try:
                    with gzip.open(d_path) as f:
                        data_tweets = json.loads(f.read().decode('utf-8'))

                    for t in data_tweets:
                        if t["user_id"] in chunk_users:
                            tweets.append(t)

                except:
                    print("Error with file " + day_t)
                    continue

        
    user_array = list(users.values())

    # Create directories if don't exists 
    user_path = "mongo_files/users/"
    os.makedirs(os.path.dirname(user_path), exist_ok=True)
    with gzip.open(user_path + "mongo-user-data-{}_{}.json.gz".format(i+1, n_chunks), 'wt', encoding='UTF-8') as f:
        json.dump(user_array, f)

    tweet_path = "mongo_files/tweets/
    os.makedirs(os.path.dirname(user_path), exist_ok=True)    
    with gzip.open(tweet_path + "mongo-tweet-data-{}_{}.json.gz".format(i+1, n_chunks), 'wt', encoding='UTF-8') as f:
        json.dump(tweets, f)

