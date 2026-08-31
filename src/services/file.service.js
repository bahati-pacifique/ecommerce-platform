const storage = require('../configs/storage.config');

const path = require('path');

class FileServices {
    /**
     * Moves a file to the user profiles directory
     * @param {object} file - The file object from express-fileupload (req.files.image)
     * @returns {string} The generated unique filename
     */
    static async uploadProfileImage(file) {
        // Create a unique file name using a timestamp to prevent overwriting files
        // const fileExtension = path.extname(file.name);
        // const uniqueFileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExtension}`;

        const fileName = file.name;

        // Construct destination path
        const destination = path.join(
            storage.profiles,
            fileName
        );

        await file.mv(destination);

        //TODO implement Log activity
        console.log('User profile image uploaded')

        return destination;
    }

    /**
     * Uploads and renames a business user photo ID based on their User ID
     * @param {object} file - The uploaded file object
     * @returns {string} The final saved file name
     */
    static async uploadUserPhotoId(file) {
        
        const fileExtension = path.extname(file.name);

        // Name the file exactly after the user's ID
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

}

module.exports = FileServices;