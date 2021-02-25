from django.db import models

class User(models.Model):
    id = models.IntegerField()
    screen_name = models.CharField(max_length=30)
    date = models.DateTimeField()
    followers_count = models.IntegerField()