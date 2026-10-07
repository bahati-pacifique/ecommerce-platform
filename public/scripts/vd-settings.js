class SettingManager {
    constructor() {
        this.settingInput = document.querySelectorAll('.vendor-setting');
        this._wire();
    }

    _wire() {
        this.settingInput.forEach((input) => {
            input.addEventListener('click', (e)=>{
                e.preventDefault();

                Notification.showNotification({
                    type: 'warning',
                    message: "Sorry — Setting is not enabled for you"
                })
            })
        })
    }

}