import pandas as pd
import numpy as np
from os import listdir
import json
import csv
    
def get_active_users(active_users, row):
    """Function that adds the user in row to the list of active_users"""

    user = row["user"]

    if user["followers_count"] > 1000 and user["statuses_count"] > 5:
        active_users.add(user["id"])

    if 'retweeted_status' in row and not pd.isna(row['retweeted_status']):
        get_active_users(active_users, row['retweeted_status']) 

    if 'quoted_status' in row and not pd.isna(row['quoted_status']):
        get_active_users(active_users, row['quoted_status'])


path = "2020/12/"

active_users = set()

for d in listdir(path): # day of the month

    print("Starting day : " + d + " | Number of active users : {}".format(len(active_users)))
    d_path = path + "/" + d + "/"


    for h in listdir(d_path): # hours of the day
        print("   Hour : " + h)
        h_path = d_path + "/" + h + "/"
        for m in listdir(h_path): # minutes of the hour
            m_path = h_path + "/" + m
            print(m)

            df = pd.read_json(m_path, lines=True)[["user", "retweeted_status", "quoted_status"]]
            df.dropna(how="all", inplace=True)

            for index, row in df.iterrows():
                get_active_users(active_users, row)

with open("active_users_2020_12.csv".format(d), "w", newline="") as f:
    write = csv.writer(f)
    write.writerow(["user_id"])
    for u in active_users:
        write.writerow([u])

