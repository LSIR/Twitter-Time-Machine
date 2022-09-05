# Data

## Data creation

This readme explains how to create the files for the Twitter Time Machine application, using the archives from archive.org.

First of all, note that all data and files should be in the same root directory. Don't worry if the running time is very long (in the 7 to 10 days per step for common hardware), this is normal.

0 - Run the 0_get_active_users.py (or its threaded version, see comments in the file) to create the list of active users that will only be kept for storage and computation time reasons.
    For your convenience, the file is already generated and available at active_users_2020_12.csv. Feel free to adapt the code (in all files) to consider another of users.

1 - Run 1_tweets_processing.py. This step uses the previously created list to iterate on all files from 2011 to 2021 and remove all unnecessary users, unecessary attributes and parse the tweets to create the tweets and users file.
    Note that this will create 2 files for each day, and therefore each user is present in each file. This intermdiate step is necessary as it is not possible (at least with common hardware) to keep the data for all the users and all 10 years in memory at the same time.
    You should give 2 arguments when running this file : the year and the month of the data to process, with a leading zero for the month (e.g 2012 09 or 2020 12). This allows to run in parallel and use as many cores/threads as available in your system.

2 - Run 2_create_database_files.py to merge the daily files into multiple files containing disjoint set of users with all 10 years of data. By default, this creates 100 different files for the tweets and 100 different files for the users.
    This scripts take 3 arguments : the total number of files that should be created (to create multiple files in parallel, the default is 100), and the start and finish files for this run of the file.
    For instance, if you call the file like this : "python 2_create_database_files.py 100 10 20" it will create the file 10 to 19 of the 100 total files. This allows to adapt the computation to the capabilities of your machine.
    If you have 10 cores available for example you could run it in 10 runs of 10 files (this took around 10 days on our machine)

3 - This step and the next are required if you want to use MongoDB to store the data. MongoDB imposes a limit on the size per document in the collection (16 MegaBytes). Unfortunately, for a very few number of users (39 out of millions in our case), they exceed this size.
    The options are the either to discard them, or to ignore some of their history. Since some important users such as Joe Biden and Trump are one of those large users, we offer the possibility to reprocess them if needed.
    First of all, run the file 3_remove_large_users.py. This will remove these so called large users and allow to import the files easily in MongoDB. It will also create a file "ignored_users.json" that contains these users.

4 - Run 4_reduce_user_size.py. This last step process the previously ignored users and remove some unecessary data (note that all data on tweets is kept, only data points for followers count, statuses count, etc ... are removed from the history).
    The created file called "ignored_users_16mb.json" can be imported directly in MongoDB.

## Populate the database

First, create the database and the collections using the mongo shell:

```bash
mongo
> use trollcheck

> db.createCollection("users")
> db.createCollection("tweets")

> db.users.createIndex({ "details.id": 1})
> db.tweets.createIndex({ "user_id": 1})
```

Then, you can import each file in the data folder with the following command:

```bash
gunzip -c <FILENAME.json.gz> | mongoimport --db=<DB-NAME> --collection=<COLLECTION-NAME> --type=json --jsonArray --legacy
```

Data from the `deleted_tweets` folder needs to be imported in the `tweets` collection.
