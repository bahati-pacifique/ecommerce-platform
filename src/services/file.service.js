const storage = require('../configs/storage.config');

const path = require('path');
//import { rm } from 'node:fs/promises';
const { unlink } = require('node:fs/promises');

class FileServices {
    /**
     * Moves a file to the user profiles directory
     * @param {object} file - The file object from express-fileupload (req.files.image)
     * @returns {string} The generated unique filename
     */
    static async uploadProfileImage(file) {

        const fileName = file.name;

        // Construct destination path
        const destination = path.join(
            storage.profiles,
            fileName
        );

        await file.mv(destination);

        //TODO implement Log activity

        return destination;
    }

    /**
    * Removes a file from the storage directory.
    * 
    * @param {string} relativePath file's relative path
    * @returns {Promise<boolean>} returns true if file was removed, otherwise throw an error
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
            console.error(`Error deleting file: ${error.message}`);
            throw new Error(`Error deleting file: ${error.message}`)
        }
    }

    /**
     * Uploads and renames a business user photo ID based on their User ID
     * @param {object} file - The uploaded file object
     * @returns {string} The final saved file name
     */
    static async uploadUserPhotoId(file) {

        const fileName = file.name;

        const destination = path.join(
            storage.profileIds,
            fileName
        );

        // Save the file
        await file.mv(destination);

        console.log('User id copy image uploaded')

        // Return the final file name so the controller can save it to the DB
        return destination;
    }

    static async uploadStoreAvatar(file) {

        const fileName = file.name;

        const destination = path.join(
            storage.business,
            'images',
            'stores',
            fileName
        );

        // Save the file
        await file.mv(destination);

        // Return the final file name so the controller can save it to the DB
        return destination;
    }

}

module.exports = FileServices;