#!/bin/bash
export $(dokku config:show your-app-name | xargs)
