#!/usr/bin/bash

LIBRARY=$1
[[ $LIBRARY == "" ]] && 
    echo "Missing required argument! Usage: ./download <library>" && 
    exit 1

VERSION=$2
if [[ $VERSION == "" ]]
then
    VERSION="latest"
fi

LIBRARY_PATH="./root/$LIBRARY"
LIBRARY_URL="https://ghadeeras.github.io/$LIBRARY/$VERSION.zip"
echo
echo "Download request details:"
echo " - Library directory: $LIBRARY_PATH"
echo " - Library URL: $LIBRARY_URL"
echo

echo "Checking/setting up workspace ..."
mkdir "./root" 2>/dev/null &&
    echo " - Created 'root' directory."
rm -R "$LIBRARY_PATH" 2>/dev/null
mkdir -p "$LIBRARY_PATH" 2>/dev/null &&
    echo " - Created library '$LIBRARY' directory."
echo "Workspace is ready."
echo

echo "Downloading $LIBRARY ..."
curl --no-buffer --location --fail "$LIBRARY_URL" > "$LIBRARY_PATH.zip"
unzip -o "$LIBRARY_PATH.zip" -d "$LIBRARY_PATH"
rm "$LIBRARY_PATH.zip"
echo

echo "Downloaded files in '$LIBRARY_PATH':"
find "$LIBRARY_PATH" -type f |
    xargs -I {} \
    echo " - {}" 
