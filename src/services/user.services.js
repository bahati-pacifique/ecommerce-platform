const UserModel = require('../models/users.model');

class UserServices {
    /**
     * Update user's username identifier
     * @param {uuid|string} userId 
     * @param {string} newUsername 
     * @returns updated user or null if no affected user
     */
    static async changeUsername(userId) {
        const user = await UserModel.getById(userId)

        if (!user) {
            throw new Error('User does not exists or id provided is invalid');
        }

        if (user.username === newUsername) {
            throw new Error('This is already your username')
        }

        const isNewUsernameExists = await UserModel.isUsernameExist(newUsername);

        if (isNewUsernameExists) {
            throw new Error('Username already exists');
        }

        const result = await UserModel.updateUsername(userId, newUsername);

        return result;
    }

    async changePassword(userId, currentPassword, newPassword) {
        const auth = await AuthenticationRepository.findByUserIdAndProvider(
            userId,
            "password"
        );

        if (!auth) {
            throw new Error("Password authentication not found");
        }

        const matches = await bcrypt.compare(
            currentPassword,
            auth.password_hash
        );

        if (!matches) {
            throw new Error("Incorrect current password");
        }

        const samePassword = await bcrypt.compare(
            newPassword,
            auth.password_hash
        );

        if (samePassword) {
            throw new Error("New password must be different");
        }

        const hash = await bcrypt.hash(newPassword, 12);

        await AuthenticationRepository.updatePasswordHash(userId, hash);

        return true;
    }

    static async updateNames({ userId, firstName, lastName }) {

        if (firstName !== undefined) firstName = firstName.trim();
        if (lastName !== undefined) lastName = lastName.trim();

        if (firstName === undefined && lastName === undefined) {
            throw new Error("Nothing to update");
        }

        if (firstName !== undefined && firstName.length < 2) {
            throw new Error("First name must be at least 2 characters.");
        }

        if (lastName !== undefined && lastName.length < 2) {
            throw new Error("Last name must be at least 2 characters.");
        }

        const user = await UserRepository.updateNames({
            userId,
            firstName,
            lastName
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    }


    static async getUser(userId, userIdNo, email) {
        let user;

        if (userId) {
            user = await UserModel.getById(userId);
        } else if (userIdNo){
            user = await UserModel.getByIdNo(userIdNo);
        } else if (email) {
            user = await UserModel.getByEmail(email);
        } else {
            throw new Error('User identifier not specified');
        }

        if (!user) throw new Error('User not found');

        return user;
    }

    static async updateProfile(userId, profile) {

        if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
            throw new Error("Invalid profile data.");
        }

        if (profile.bio !== undefined) {
            profile.bio = profile.bio.trim();

            if (profile.bio.length > 500) {
                throw new Error("Bio cannot exceed 500 characters.");
            }
        }

        if (profile.website !== undefined) {
            profile.website = profile.website.trim();

            if (profile.website.length > 255) {
                throw new Error("Website is too long.");
            }
        }

        if (profile.phone !== undefined) {
            profile.phone = profile.phone.trim();
        }

        // Save profile
        const user = await UserRepository.updateProfile(userId, profile);

        if (!user) {
            throw new Error("User not found.");
        }

        return user;
    }

    static async updatePhoneNumber(userId, newPhoneNumber){
        const result = await UserModel.updatePhoneNumber(userId, newPhoneNumber);

        if (!result) throw new Error('Failed — user does not exits or check user id');

        return result;
    }

    static async createUser(userInfo) {
        const result = await UserModel.createUser(userInfo);

        return result;
    }

    static async getRandomUserByAccountCategory(selectors){
        return await UserModel.getRandomUserByAccountCategory(selectors)
    }

    static async checkUsername(username){
        try {
            const isAvailable = await UserModel.checkUsernameAvailable(username);
            return isAvailable;
        } catch (error) {
            console.log("checkUsername(): ",error)
            return null;
        }
    }

}

module.exports = UserServices;