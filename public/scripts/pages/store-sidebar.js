$(document).ready(() => {
    $('#profileImage').one('error', (e)=>{
        $('#profileImage').attr('src', `https://ui-avatars.com/api/?name=${username}`);
    });
});