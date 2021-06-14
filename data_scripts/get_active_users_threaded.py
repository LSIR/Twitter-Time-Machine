import pandas as pd
from os import listdir
import csv
import math
import sys
    
def get_active_users(active_users, row):

    user = row["user"]

    if user["followers_count"] > 5000 and user["statuses_count"] > 10: # Keep only users with more than 5'000 followers and having posted more than 10 tweets
        active_users.add(user["id"])

    if 'retweeted_status' in row and not pd.isna(row['retweeted_status']):
        get_active_users(active_users, row['retweeted_status']) 

    if 'quoted_status' in row and not pd.isna(row['quoted_status']):
        get_active_users(active_users, row['quoted_status'])



# Path of the data (month)
path = "2020/12/"

start = 0
finish = len(listdir(path))


# Parse command line arguments to get thread info
if(len(sys.argv) > 0):
    try:
        thread_number = int(sys.argv[1])

        tot_thread = 6

        length_thread = math.floor(len(listdir(path)) / tot_thread)

        if(thread_number < tot_thread):
            start = thread_number * length_thread

        if(thread_number < tot_thread - 1):
            finish = (thread_number + 1)*length_thread

        print("Running with thread number " + str(thread_number) + ". Computing for days " + str(start + 1) + " - " + str(finish))
    except:
        print("Argument not recognized")

else:
    print("No thread number found, running single threaded on whole data")

active_users = set()

for d in listdir(path)[start : finish]: # day of the month

    print("Starting day : " + d + " | Number of active users : {}".format(len(active_users)))
    d_path = path + "/" + d + "/"


    for h in listdir(d_path): # hours of the day
        print("   Hour : " + h)
        h_path = d_path + "/" + h + "/"
        for m in listdir(h_path): # minutes of the hour
            m_path = h_path + "/" + m

            try:
                df = pd.read_json(m_path, lines=True)[["user", "retweeted_status", "quoted_status"]]
                df.dropna(how="all", inplace=True)

                for index, row in df.iterrows():
                    get_active_users(active_users, row)
            except:
                print("Error : couldn't read file " + m)
    

    # Write the file after each day, not to lose everything in case of an error
    with open("active_users_" + path[0:4] + "_" + path[5:7] + "_{}_{}.csv".format(start, finish), "w", newline="") as f:
        write = csv.writer(f)
        write.writerow(["user_id"])
        for u in active_users:
            write.writerow([u])

