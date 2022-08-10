FROM python:3.9-slim

# Set Python variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory
WORKDIR /code

# Install any needed packages specified in requirements.txt
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# Run as non-root user
RUN adduser -H -D -s /bin/bash nobody
RUN chown -R nobody /code

# Copy the current directory contents into the working directory
COPY --chown=nobody . /code/

# Collect Django static files
RUN DJANGO_STATIC_ROOT=/static python manage.py collectstatic --no-input -v 2

# Expose API port
EXPOSE 8000

USER nobody

CMD ["gunicorn", "tcb.wsgi:application", "--bind", "0.0.0.0:8000"]