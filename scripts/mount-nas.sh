#!/bin/bash

NAS_IP="${NAS_IP:-192.168.1.100}"
NAS_SHARE="${NAS_SHARE:-backups}"
NAS_USER="${NAS_USER:-admin}"
NAS_PASS="${NAS_PASS:-password}"
MOUNT_POINT="/mnt/nas"

echo "Mounting NAS at ${MOUNT_POINT}..."

sudo mkdir -p ${MOUNT_POINT}

if mount | grep ${MOUNT_POINT} > /dev/null; then
    echo "NAS already mounted"
    exit 0
fi

sudo mount -t cifs //${NAS_IP}/${NAS_SHARE} ${MOUNT_POINT} \
    -o username=${NAS_USER},password=${NAS_PASS},uid=1000,gid=1000,iocharset=utf8

if [ $? -eq 0 ]; then
    echo "NAS mounted successfully"

    sudo mkdir -p ${MOUNT_POINT}/backups
    sudo mkdir -p ${MOUNT_POINT}/office

    echo "//${NAS_IP}/${NAS_SHARE} ${MOUNT_POINT} cifs username=${NAS_USER},password=${NAS_PASS},uid=1000,gid=1000,iocharset=utf8 0 0" | sudo tee -a /etc/fstab

    echo "NAS mount added to /etc/fstab for automatic mounting on boot"
else
    echo "Failed to mount NAS"
    exit 1
fi
