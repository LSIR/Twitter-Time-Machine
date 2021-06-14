import pandas as pd

users1 = pd.read_csv("active_users_2020_12_0_5.csv")
users2 = pd.read_csv("active_users_2020_12_5_10.csv")
users3 = pd.read_csv("active_users_2020_12_10_15.csv")
users4 = pd.read_csv("active_users_2020_12_15_20.csv")
users5 = pd.read_csv("active_users_2020_12_20_25.csv")
users6 = pd.read_csv("active_users_2020_12_25_31.csv")

merged = pd.merge(users1, users2, how="outer", on="user_id")
merged = pd.merge(merged, users3, how="outer", on="user_id")
merged = pd.merge(merged, users4, how="outer", on="user_id")
merged = pd.merge(merged, users5, how="outer", on="user_id")
merged = pd.merge(merged, users6, how="outer", on="user_id")
merged = merged.drop_duplicates()

print("Size users 1 : {}".format(len(users1)))
print("Size users 2 : {}".format(len(users2)))
print("Size users 3 : {}".format(len(users3)))
print("Size merged : {}".format(len(merged)))

print(merged.head())
merged.to_csv("active_users_2020_12.csv")
