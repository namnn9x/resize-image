/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import * as functions from 'firebase-functions'
import { Storage } from '@google-cloud/storage'
const gcs = new Storage();

import { tmpdir } from 'os'
import { join, dirname } from 'path'

import * as sharp from 'sharp'
import * as fs from 'fs-extra'

export const generateThumbs = functions.storage.object().onFinalize(async object => {
    const bucket = gcs.bucket(object.bucket);
    const filePath = object.name as string;
    const fileName = filePath?.split('/').pop();
    const bucketDir = dirname(filePath);

    const workingDir = join(tmpdir(), 'thumbs');
    const tmpFilePath = join(workingDir, 'source.png');

    if(fileName?.includes('thumb@') || !object.contentType?.includes('image')) {
        console.log('exiting function')
        return false
    }

    await fs.ensureDir(workingDir);


    // Download source file
    await bucket.file(filePath).download({
        destination: tmpFilePath
    })

    // Resize
    const sizes = [64, 128, 256];
    const uploadPromies = sizes.map(async size => {
        const thumbName = `thumb@${size}_${fileName}`;
        const thumbPath = join(workingDir, thumbName);

        await sharp(tmpFilePath)
            .resize(size, size)
            .toFile(thumbPath);

        return bucket.upload(thumbPath, {
            destination: join(bucketDir, thumbName)
        })
    })

    await Promise.all(uploadPromies)

    return fs.remove(workingDir)
})



