class VendorInventory {
    constructor() {
        this.inventoryCountBadges = document.getElementById('inventoryCountBadges');
        this.inventoryTabTable = document.getElementById('inventoryTabTable');
        this.inventoryTabTableContainer = document.getElementById('inventoryTabTableContainer');
        this.inventoryLoader = document.getElementById('inventoryLoader');
        this.inventoryContainer = document.getElementById('inventoryContainer');
        this.inventoryLoadErrorContainer = document.getElementById('inventoryLoadErrorContainer');
        this.inventoryLoadErrorMsg = document.getElementById('inventoryLoadErrorMsg');
        this.inventoryErrorRefreshBtn = document.getElementById('inventoryErrorRefreshBtn');
        this.inventoryDataRefreshBtn = document.getElementById('inventoryDataRefreshBtn');

        this.loadedData = false;
        this.isFetching = false;

        this.init();
    }

    init() {
        this.fetchInventoryDashBoard();

        this.inventoryErrorRefreshBtn.addEventListener('click', () => {
            this.fetchInventoryDashBoard();
        });

        this.inventoryDataRefreshBtn.addEventListener('click', () => {
            this.fetchInventoryDashBoard();
        })
    }

    async fetchInventoryDashBoard() {

        if (this.isFetching) return;
        this.isFetching = true;

        this.inventoryLoader.classList.remove('hidden');
        this.inventoryLoadErrorContainer.classList.add('hidden');

        if (!this.loadedData) {
            this.inventoryContainer.classList.add('hidden');
        }

        try {

            const response = await axios.get(
                `${protocal}api.${domainName}/inventory/data/vendor`,
                { withCredentials: true }
            );

            console.log(response.data);

            $('#total-invt').text(response.data.inventories?.total || '0');
            $('#active-invt').text(response.data.inventories?.active || '0');
            $('#inactive-invt').text(response.data.inventories?.inactive || '0');
            $('#def-invt').text(response.data.inventories?.default || '0');

            this.inventoryTabTableContainer.classList.remove('hidden')

            const transactions = response.data?.transactions || {};
            const stock = response.data?.stock || {};
            const units = response.data?.units || {};

            const inventories = response.data.inventory_list || [];

            const empty = inventories.length === 0;

            $('.inv-data-field').toggleClass('hidden', empty);
            $('#emptyInvContainer').toggleClass('hidden', !empty);

            $('#inventoryTranstions').html('');
            $('#inventoryStock').html('');
            $('#inventoryUnits').html('');

            for (const key of Object.keys(transactions)) {
                $('#inventoryTranstions').prepend(`
                    <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <p class="text-base font-bold text-gray-500 first-letter:uppercase">${key.replaceAll('_', ' ')}: </p>
                        <p class="text-lg font-extrabold text-gray-800">${transactions[key]}</p>
                    </div>`);
            }

            for (const key of Object.keys(stock)) {
                $('#inventoryStock').prepend(`
                    <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <p class="text-base font-bold text-gray-500 first-letter:uppercase">${key.replaceAll('_', ' ')}: </p>
                        <p class="text-lg font-extrabold text-gray-800">${stock[key]}</p>
                    </div>`);
            }

            for (const key of Object.keys(units)) {
                $('#inventoryUnits').prepend(`
                    <div class="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                        <p class="text-base font-bold text-gray-500 first-letter:uppercase">${key.replaceAll('_', ' ')}: </p>
                        <p class="text-lg font-extrabold text-gray-800">${units[key]}</p>
                    </div>`);
            }

            $('#inventoryTableBody').html('');

            inventories.forEach(data => {
                $('#inventoryTableBody').append(`
                    <tr class="border-b border-gray-50 hover:bg-gray-50 transition inventory-row cursor-pointer">
                        <td class="px-4 py-3">
                            <p class="text-sm font-medium text-gray-900">${data.title}</p>
                            <p class="text-xs text-gray-400">${data.store_name}</p>
                        </td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell flex flex-col">
                            <span class="status-badge ${data.status} capitalize">
                                ${data.is_default ? `<span class="text-emerald-500 font-extrabold">&bull;</span> ` : ''}
                                ${data.status}
                            </span>
                            
                        </td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.low_stock}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.out_of_stock}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.total_available}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.total_reserved}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.total_items}</td>
                        <td class="px-4 py-3 text-center text-sm text-gray-500 hidden md:table-cell">${data.total_quantity}</td>
                  </tr>
                `);
            });

            this.inventoryContainer.classList.remove('hidden');
            this.loadedData = true;
        } catch (error) {
            console.log(error);

            this.inventoryContainer.classList.add('hidden');
            this.inventoryLoadErrorContainer.classList.remove('hidden');
            this.inventoryLoadErrorMsg.textContent = error.response?.data?.message || 'Internal Server Error';
        } finally {

            this.inventoryLoader.classList.add('hidden');
            this.isFetching = false;
        }
    }
}