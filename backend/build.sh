#!/usr/bin/env bash
# exit on error
set -o errexit

pip install -r requirements.txt

python projectdev/manage.py collectstatic --no-input
python projectdev/manage.py migrate
