import pandas as pd
import numpy as np
from os import listdir
import sys
import json
import gzip

# Path of the data (month)
data = "mongo_files/users/"
ignored_users = []


for users in listdir(data): # map to list and indexing to run it in parallel
    print("Starting file {}".format(users))

    users_16mb = []

    with gzip.open(data + "/" + users) as f:
        data_users = json.loads(f.read().decode('utf-8'))

    for user in data_users:
        history_size = sum([sys.getsizeof(h) for h in user["history"]]) / (1024*1024)

        if history_size < 12: # keep user only if its history size is < 15.5 MB, otherwise doesn't fit in mongodb (need total size < 16MB)
            users_16mb.append(user)
            a = []
        else:
            ignored_users.append(user)

    # Create directories if don't exists 
    os.makedirs(os.path.dirname("mongo_files/users_16mb/"), exist_ok=True)
    with gzip.open("mongo_files/users_16mb/{}".format(users), 'wt', encoding='UTF-8') as f:
        json.dump(users_16mb, f)

with gzip.open("ignored_users.json.gz", 'wt', encoding='UTF-8') as f:
        json.dump(ignored_users, f)