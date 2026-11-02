console.log("ListingId", _LISTINGID);

async function getListing() {
    try {
        const response = await axios.get(``, {
            withCredentials: true, headers: {
                'Accept': 'application/json'
            }
        });
        console.log(response.data);
    } catch (error) {
        console.log(error);
        Notification.showNotification({
            type: 'error',
            message: error.response?.data?.message || 'Internal Server Error'
        })
    }
}

getListing();