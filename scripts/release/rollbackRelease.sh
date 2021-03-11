#!/bin/bash

if [ "$#" -lt 1 ]
  then
    echo "You must supply a release tag"
    echo "For example: ./scripts/release/rollbackRelease.sh vDocs-25.1.0-20210309"
    exit 1
fi

# will be in the form of vDocs-25.1.0-20210309
TAG=$1

# extract the date component - ie 20210309
TIMESTAMP=`sed 's/.*-//g'`

CREDENTIALS_LOCATION=$HOME/$CREDENTIALS_FILE
SSH_LOCATION=$HOME/$SSH_FILE

if [ -z "$SSH_LOCATION" ]
then
      echo "\$SSH_LOCATION is not set"
      exit;
fi

if [ -z "$CREDENTIALS_LOCATION" ]
then
      echo "\$CREDENTIALS_LOCATION is not set"
      exit;
fi

function checkFileExists {
    file=$1
    if ! [[ -f "$file" ]]
    then
        echo "File [$file] doesn't exist - exiting script.";
        exit;
    fi
}

checkFileExists $SSH_LOCATION
checkFileExists $CREDENTIALS_LOCATION

# $2 is optional skipWarning argument
if [ "$2" != "skipWarning" ]; then
    while true; do
      echo    ""
      echo    "*********************************** ******* ************************************************"
      echo    "*********************************** WARNING ************************************************"
      echo    "*********************************** ******* ************************************************"
      read -p "This script will ROLLBACK to the TIMESTAMP PROVIDED. The LIVE VERSION of AG-GRID will be REPLACED!. Do you wish to continue [y/n]? " yn
      case $yn in
          [Yy]* ) break;;
          [Nn]* ) exit;;
          * ) echo "Please answer [y]es or [n]o.";;
      esac
    done
fi

# copy the remote script that will create tmp dirs, unzip the new deployment etc to the upload dir (archives)
curl --netrc-file $CREDENTIALS_LOCATION --ftp-create-dirs -T "./scripts/release/switchReleaseRemote.sh" ftp://ag-grid.com/
# move prepareNewDeploymentRemote from the archives dir to the root, and make it executable
ssh -i $SSH_LOCATION ceolter@ag-grid.com "mv public_html/archive/switchReleaseRemote.sh ./"
ssh -i $SSH_LOCATION ceolter@ag-grid.com "chmod +x ./switchReleaseRemote.sh"

# backup the old public_html, unzip the new release and update permissions etc
# we do this via a remote script as there are many steps and doing so one by one remotely times out occasionally
echo "cd /home/ceolter/ && ./switchReleaseRemote.sh $TIMESTAMP"
ssh -i $SSH_LOCATION ceolter@ag-grid.com "cd /home/ceolter/ && ./switchReleaseRemote.sh $TIMESTAMP"
