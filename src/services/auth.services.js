const authModel = require('../models/auth.model');
const sessionModel = require('../models/session.model');
const { 
    normalizeUA, 
    setPreauth, 
    signPreAuth, 
    signAccessToken, 
    signRefreshToken, 
    decodePreauthToken, 
    sameNetwork,
    setAuthCookies, 
    decodeAuthCookies
 } = require('../../util/authTokens');

const bcrypt = require('bcrypt');

class AuthService {

    async login(username, email, ip, password, agent) {

        // if (!username && !email) {
        //     throw new Error('Username or email is required');
        // }

        // if (!password) {
        //     throw new Error(`Can't signin without password`);
        // }

        // if (!agent) {
        //     throw new Error(`Sorry — Something went wrong`)
        // }

        let user, identifier;

        try {

            identifier = username || email;

            user = await authModel.getUserByUsernameOrEmail(identifier);

            if (!user) {
                throw new Error(`Account not found`);
            }

            const match = await bcrypt.compare(password, user.password_hash);

            if (!match) {
                throw new Error('Invalid credentials — Please check account/password');
            }

            const preauth = await authModel.createPreauth({ userId: user.id, ip, agent: normalizeUA(agent) });

            //Update user account last_active
            await authModel.setUserAccountActiveStatus('user', user.id);

            //TODO: Log activity for audit logs

            return {
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                preauth
            };
        } catch (error) {
            console.log(error);
            if (error.code === '23505' && error.constraint === 'uniq_unused_preauth_per_user' && user) {

                const preauth = await authModel.getUnusedPreauthByUser(user.id);

                if (!preauth) {
                    let affected = '';

                    try {
                        affected = await authModel.expirePreauthForUser(user.id);
                    } catch (error) {
                        console.error(error);
                        throw new Error('Something went wrong, please try to log in again')
                    }

                    //Insteadof denying user login attempt let's do a recursive, after expiring last preauth.
                    if (affected > 0) return this.login({ username, email, ip, password, agent });

                    return {
                        success: false,
                        message: 'Session expired. Please re-login to continue'
                    };

                }

                if (preauth.ip !== ip || preauth.agent !== normalizeUA(agent)) {

                    //Probably, kill preauth and render login
                    const affected = await authModel.expireUserPreauths(user.id);

                    return {
                        success: false,
                        message: affected >= 0 ? 'Session terminated, please login again' : 'Something Went Wrong — Please Login Again.',
                        affected
                    };
                }

                const accounts = await authModel.getUserAccounts(user.id, { onlyValid: true });

                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    },
                    accounts,
                    preauth
                };
            }
            console.log("***", error.message)
            throw new Error(error.message || 'Something went wrong — Log in to continue')
        }
    }

    /**
     * @param {*} payload 
     * payload: { userAccount: any;
     *   jwtId: any;
     *   refreshToken: any;
     *   ipAddress: any;
     *   timezone: any;
     *   userAgent: any
     *  }
     * 
     * @returns new Session instance
     */
    async createSession(payload) {
        try {
            const result = await sessionModel.create(payload);
            return result;
        } catch (error) {
            console.log(error)
            return null;
        }
    }

    async sessionValidation(tokenPayloads) {

        try {
            const session = await sessionModel.findValidByRefresh(tokenPayloads);

            if (!session) return {
                success: false,
                message: 'Failed — Session Not Found'
            }

            const sessionAccount = session.userAccount;
            const sessionIp = session.ipAddress;
            const sessionAgent = session.userAgent;
            const sessionTimezone = session.timezone;

            const okAgent = sessionAgent === tokenPayloads.ua;

            if (!okAgent) {
                return {
                    success: false,
                    message: 'We detect suspicious activity — Please log again'
                }
            }

            const user = await authModel.getUserAccount(tokenPayloads.userId, sessionAccount);

            if (!user) {
                return {
                    success: false,
                    message: 'Session error — Please log in again'
                }
            }

            return {
                success: true,
                userAccount: user,
                sessionId: session.id
            }

        } catch (error) {
            console.log(error)
            return {
                success: false,
                message: 'Internal Error'
            }
        }
    }

    async getUserAccounts(userId) {
        try {
            const accounts = await authModel.getUserAccounts(userId, {onlyValid: true});
            return accounts;
        } catch (error) {
            console.log(error);

            return null;
        }
    }

    async validateLogin(preAuthId, userId, accountId, req) {

        console.log(preAuthId, userId, accountId)

        if (!preAuthId || !userId || !accountId) return {
            success: false,
            message: 'Failed — Authorization can not validated'
        };

        try {

            const preAuth = await authModel.getUnusedPreauth(preAuthId);

            if (!preAuth) return {
                success: false,
                authenticated: false,
                message: `Oops — We're unable to get you authorized`,
                status: 'PREAUTH_ERROR'
            };

            //Validating preauth
            if (preAuth.user_id !== userId) return {
                success: false,
                message: 'Invalid session data'
            }

            if (normalizeUA(req.get('User-Agent')) !== preAuth.agent) {
                //Hijacking detected
                //TODO Implement: Log activity
                return {
                    success: false,
                    message: `We detect suspicious behavior — Please log in again`
                }
            }

            //Load user account
            const userAccount = await authModel.getUserAccount(userId, accountId);

            if (!userAccount) {
                return {
                    success: false,
                    message: 'Account was not found — Contact our support team'
                }
            }

            //Updating active status
            await authModel.setUserAccountActiveStatus('user_account', accountId);
            await authModel.expirePreauthForUser(userId);

            return {
                success: true,
                authenticated: true,
                message: `Welcome to ${userAccount.title}`,
                userAccount
            }


        } catch (error) {
            console.log(error);
            return {
                success: false,
                message: 'Failed: There was an internal error'
            }
        }
    }

    async rotateRefreshToken(sessionId, jwtId, rawRefreshToken) {
        try {

            const updatedSession = await authModel.rotateRefreshToken(sessionId, jwtId, rawRefreshToken);

            if (updatedSession) {
                return {
                    success: true,
                    updatedSession
                };
            } else {
                return {
                    success: false,
                    message: "No matching session found to update."
                };
            }

        } catch (error) {
            console.error("Database or connection error during rotation:", error);
            return {
                success: false,
                message: "Sorry, There was internal server error."
            };
        }
    }
    async logout(userAccount) {
        try {
            const session = await sessionModel.invalidateAllForUser(userAccount);
            return session;
        } catch (error) {
            console.log(error);
        }
    }

}

module.exports = new AuthService();