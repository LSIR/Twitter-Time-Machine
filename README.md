# Twitter Time Machine

This repository contains the code to run the website for our application Twitter Time Machine, as well as the code to generate the data.
See [data_scripts](./data_scripts/) folder for details on how to generate the data used in this application.

This application was created as part of our semester project at EPFL with LSIR.

## Usage

- Prepare the data as specified in the [data_scripts](./data_scripts/) folder.
- Replace `TWITTER_BEARER_TOKEN` inside `docker-compose.yml` with your own Twitter bearer token.
- Run the stack with:

    ```bash
    docker-compose up -d
    ```

## Credits

Developed by Thomas Ibanez & Alexandre Hutter.

## License

This is free software licensed under the General Public License, version 3.0.
