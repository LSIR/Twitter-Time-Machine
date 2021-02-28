import pandas as pd
import numpy as np

def extract_tweets(dataFrame):
    """Extract the tweets and filter the interesting attributes
       from a dataframe of tweets and retweets"""
    
    tweets = dataFrame[dataFrame.retweeted_status.notnull().apply(lambda x: not x)] 
    tweets = tweets[["id_str", "text", "created_at", "user", "retweet_count"]]
    tweets["created_at"] = pd.to_datetime(tweets["created_at"])
    tweets["id_str"] = pd.to_numeric(tweets["id_str"])
    tweets = tweets.rename(columns={"id_str":"tweet_id"})
    
    #Extract informations from user attribute : 
    temp = tweets["user"].apply(pd.Series)[["id", "screen_name", "followers_count"]].rename(columns={"id":"user_id", "screen_name":"user_screen_name", "followers_count":"user_followers_count"})
    tweets = pd.concat([tweets.drop(["user"], axis=1), temp], axis=1).drop_duplicates(subset="tweet_id", keep="last")
    
    return tweets.set_index("tweet_id")

def extract_retweets(dataFrame):
    """Extract the retweets and filter the interesting attributes
       from a dataframe of tweets and retweets
       Informations about the original tweet which was retweeted are
       contained inside 'original_*' attributes
       Informations about the actual retweet are contained in 'retweet_*'
       attributes"""
    
    retweets = dataFrame[dataFrame.retweeted_status.notnull()]
    retweets = retweets[["id_str", "text", "created_at", "user", "retweet_count", "retweeted_status"]]
    retweets["created_at"] = pd.to_datetime(retweets["created_at"])
    retweets["id_str"] = pd.to_numeric(retweets["id_str"])
    retweets = retweets.rename(columns={"id_str":"retweet_id"})
    
    #Extract informations from retweet user attribute : 
    temp = retweets["user"].apply(pd.Series)[["id", "screen_name"]].rename(columns={"id":"retweet_user_id", "screen_name":"retweet_screen_name"})
    retweets = pd.concat([temp, retweets.drop(["user"], axis=1)], axis=1)
    
    #Extract information from original tweet user from retweet status attribute :
    temp = retweets["retweeted_status"].apply(pd.Series)[["user", "id", "retweet_count"]].rename(columns={"id":"original_tweet_id", "retweet_count":"original_retweet_count"})
    temp2 = temp["user"].apply(pd.Series)[["id", "screen_name"]].rename(columns={"id":"original_user_id", "screen_name":"original_screen_name"})
    retweets = pd.concat([retweets, temp], axis=1).drop(["user", "retweeted_status"], axis=1)
    retweets = pd.concat([retweets, temp2], axis=1).drop_duplicates(subset="retweet_id", keep="last")
    
    return retweets.set_index("retweet_id")

def extract_quotations(dataFrame):
    """Extract the quotations and filter the interesting attributes
       from a dataframe of tweets and retweets
       Informations about the creator of the tweet containing the quote are contained
       inside of 'tweet_*' attributes. 
       Informations about the quoted user are contained in 'quoted_*' attributes"""
    
    quotations = dataFrame[dataFrame.quoted_status.notnull()]
    quotations = quotations[["id_str", "text", "created_at", "user", "retweet_count", "quoted_status"]]
    quotations["created_at"] = pd.to_datetime(quotations["created_at"])
    quotations["id_str"] = pd.to_numeric(quotations["id_str"])
    quotations = quotations.rename(columns={"id_str":"tweet_id"})
    
    #Extract informations from retweet user attribute : 
    temp = quotations["user"].apply(pd.Series)[["id", "screen_name", "followers_count"]].rename(columns={"id":"tweet_user_id", "screen_name":"tweet_screen_name", "followers_count":"tweet_followers_count"})
    quotations = pd.concat([temp, quotations.drop(["user"], axis=1)], axis=1)
    
    #Extract information from original tweet user from quoted status attribute :
    temp = quotations["quoted_status"].apply(pd.Series)["user"]
    temp2 = temp.apply(pd.Series)[["id", "screen_name", "followers_count"]].rename(columns={"id":"quoted_user_id", "screen_name":"quoted_screen_name", "followers_count":"quoted_followers_count"})
    quotations = pd.concat([quotations, temp], axis=1).drop(["user", "quoted_status"], axis=1)
    quotations = pd.concat([quotations, temp2], axis=1).drop_duplicates(subset="tweet_id", keep="last")
    
    return quotations.set_index("tweet_id")

def extract_tweets_to_csv(data_input_path, user_names, user_ids):
    """Extract the tweets, retweets and quotations from the csvs named by user_ids located 
       in the subfolders named by user_names located at the given path and save the resulting dataframes to csv"""
    
    # Create the empty dataframes, with the correct column names    
    tweets     = pd.DataFrame(columns=["user_id", "user_screen_name", "user_followers_count", "tweet_id", "text", "created_at", "retweet_count"])
    retweets   = pd.DataFrame(columns=["original_user_id", "original_screen_name", "original_tweet_id", "original_retweet_count", "retweet_user_id",\
                                 "retweet_screen_name", "original_followers_count", "retweet_id", "retweet_text", "created_at", "retweet_count"])
    quotations = pd.DataFrame(columns=["quoted_user_id", "quoted_screen_name", "quoted_followers_count", "tweet_user_id", "tweet_screen_name",\
                                   "tweet_followers_count", "tweet_id", "text", "created_at", "retweet_count"]) 

    # Populate the dataframes
    for id, name in zip(user_ids, user_names):
        data_path = data_input_path + name + "/" + str(id) +".json"
        df = pd.read_json(data_path, lines=True)
        tweets = pd.concat([tweets, extract_tweets(df)], axis=0)
        retweets = pd.concat([retweets, extract_retweets(df)], axis=0)
        quotations = pd.concat([quotations, extract_quotations(df)], axis=0)
        
    # Save the dataframes to csv
    tweets.to_csv("tweets.csv")
    retweets.to_csv("retweets.csv")
    quotations.to_csv("quotations.csv")