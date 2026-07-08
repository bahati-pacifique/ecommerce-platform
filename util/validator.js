const validator = {

    email(email){
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

}

module.exports = validator;