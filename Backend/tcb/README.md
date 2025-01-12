# Backend

To use the application, you'll need a *Bearer Token* to access to Twitter APIs.
You can generate one with the following command:

```bash
curl -u "$API_KEY:$API_SECRET_KEY" \
  --data 'grant_type=client_credentials' \
  'https://api.twitter.com/oauth2/token'
```

For more information, visit [Twitter official documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens).

## Usage

- Install dependancies

    ```bash
    pip install -r requirements.txt
    ```

- Run the webserver

    ```bash
    python manage.py runserver
    ```

## Docker

*Note*: the docker image is intended for a production environment,
thus some feature (see [static files in production](https://docs.djangoproject.com/en/4.0/howto/static-files/deployment/#serving-static-files-in-production))
may not work properly running this image alone. For a full example, see the [docker-compose.yml](../../docker-compose.yml) file in the root folder.

- Build the docker image

    ```bash
    docker build -t django-tcb .
    ```

- Run the docker image

    ```bash
    docker run \
        -e MONGODB_URI=<YOUR-MONGODB-URI> -e TWITTER_BEARER_TOKEN=<YOUR-TWITTER-BEARER-TOKEN> \
        -p 8000:8000 \
        django-tcb
    ```
