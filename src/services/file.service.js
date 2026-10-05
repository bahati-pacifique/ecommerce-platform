const storage = require('../configs/storage.config');

const path = require('path');
const { unlink, mkdir, writeFile } = require('node:fs/promises');


class FileServices {

    /**
     * Moves a file to the user profiles directory.
     *
     * @param {object} file
     * @returns {string} saved file path
     */
    static async uploadProfileImage(file) {

        const fileName = file.name;

        const destination = path.join(
            storage.profiles,
            fileName
        );

        await file.mv(destination);

        // TODO: implement activity log

        return destination;
    }


    /**
     * Removes a file from the storage directory.
     *
     * @param {string} relativePath
     * @returns {Promise<boolean>}
     */
    static async removeFile(relativePath) {

        const destination = path.join(
            storage.root,
            relativePath
        );

        try {

            await unlink(destination);

            return true;

        } catch (error) {

            console.error(
                `Error deleting file: ${error.message}`
            );

            throw new Error(
                `Error deleting file: ${error.message}`
            );
        }
    }


    /**
     * Uploads a business user photo ID.
     *
     * @param {object} file
     * @returns {string} saved file path
     */
    static async uploadUserPhotoId(file) {

        const fileName = file.name;

        const destination = path.join(
            storage.profileIds,
            fileName
        );

        await file.mv(destination);

        console.log(
            'User id copy image uploaded'
        );

        return destination;
    }


    /**
     * Uploads a store avatar.
     *
     * @param {object} file
     * @returns {string} saved file path
     */
    static async uploadStoreAvatar(file) {

        const fileName = file.name;

        const destination = path.join(
            storage.business,
            'images',
            'stores',
            fileName
        );

        await file.mv(destination);

        return destination;
    }


    /**
     * Saves a processed product image.
     *
     * Product images are already processed by Sharp,
     * so this method receives a Buffer instead of
     * the original express-fileupload file.
     *
     * Storage structure:
     *
     * products/
     *   {productId}/
     *     images/
     *       {mediaId}.webp
     *
     * @param {Buffer} buffer
     * @param {string} productId
     * @param {string} mediaId
     * @returns {Promise<Object>}
     */
    static async saveProductImage(
        buffer,
        productId,
        mediaId
    ) {

        if (!Buffer.isBuffer(buffer)) {
            throw new TypeError(
                'Product image buffer is required'
            );
        }

        if (!productId) {
            throw new Error(
                'Product ID is required'
            );
        }

        if (!mediaId) {
            throw new Error(
                'Media ID is required'
            );
        }


        const directory = path.join(
            storage.products,
            'images',
            productId
            
        );


        await mkdir(directory, {
            recursive: true
        });


        const fileName =
            `${mediaId}.webp`;


        const destination =
            path.join(
                directory,
                fileName
            );


        await writeFile(
            destination,
            buffer
        );


        const storageKey =
            path.posix.join(
                'products',
                productId,
                'images',
                fileName
            );


        return {
            storageKey,
            path: destination,
            fileName,
            size: buffer.length
        };
    }
}


module.exports = FileServices;