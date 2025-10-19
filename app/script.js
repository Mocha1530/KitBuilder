const extraWearables = ["scarecrow.suit", "attire.bunny.onesie", "attire.bunnyears", "halloween.mummysuit", "scarecrowhead", "gingerbreadsuit"];
const lockWearItems = ["hazmatsuit", "scarecrow.suit", "attire.bunny.onesie", "halloween.mummysuit", "gingerbreadsuit"];
const conflictingArmorGroups = [
    ["metal.facemask", "coffeecan.helmet", "deer.skull.mask", "bucket.helmet", "hat.candle", "diving.mask", "heavy.plate.helmet", "riot.helmet", "wood.armor.helmet", "hat.wolf", "scarecrowhead"],
    ["heavy.plate.jacket", "metal.plate.torso", "roadsign.jacket", "jacket.snow", "wood.armor.jacket", "jacket"],
    ["shoes.boots", "burlap.shoes", "diving.fins", "boots.frog", "attire.hide.boots"],
    ["heavy.plate.pants", "roadsign.kilt", "wood.armor.pants"]
];

const Toast = {
    container: null,
    
    init() {
        // Create toast container if it doesn't exist
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },
    
    show(message, type = 'info', duration = 3000) {
        this.init();
        
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'toast-close';
        closeBtn.innerHTML = 'Ã—';
        closeBtn.addEventListener('click', () => this.dismiss(toast));
        
        toast.innerHTML = `<div>${message}</div>`;
        toast.appendChild(closeBtn);
        
        this.container.appendChild(toast);
        
        // Trigger reflow to enable transition
        toast.offsetHeight;
        toast.classList.add('show');
        
        // Auto dismiss after duration
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(toast);
            }, duration);
        }
        
        return toast;
    },
    
    success(message, duration = 3000) {
        return this.show(message, 'success', duration);
    },
    
    error(message, duration = 3000) {
        return this.show(message, 'error', duration);
    },
    
    info(message, duration = 3000) {
        return this.show(message, 'info', duration);
    },
    
    dismiss(toast) {
        if (!toast) return;
        
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300); // Match the CSS transition duration
    }
};

let wearLocked = false;
let selectedItemData = null;
let itemsData = {};

async function loadItemsData() {
    try {
        const response = await fetch('https://cors-anywhere.herokuapp.com/https://kb.veretech.systems/Items_organized.json', {
            headers: {
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
        }
        itemsData = await response.json();
        console.log('Items data loaded:', Object.keys(itemsData));
    } catch (error) {
        console.error('Error loading items data:', error);
        itemsData = {};
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadItemsData();
    window.items = itemsData;
    function updateWearLockStatus() {
        const wearSlots = document.querySelectorAll('.slot[data-slot-type="wear"]');
        let stillLocked = false;
        wearSlots.forEach(ws => {
            if (ws.dataset.itemId && lockWearItems.some(item => item.toLowerCase() === ws.dataset.itemId.toLowerCase())) {
                stillLocked = true;
            }
        });
        wearLocked = stillLocked;
    }

    const itemList = document.getElementById("item-list");
    const searchInput = document.getElementById("search");
    const categorySelect = document.getElementById("category");
    const kitInput = document.getElementById("kit-name");
    const output = document.getElementById("kit-output");
    const copyCommands = document.getElementById("copy-commands");
    const copyInstallCode = document.getElementById("copy-install");
    const clearAll = document.getElementById("clear-all");
    let draggedItem = null;

    const categories = itemsData && typeof itemsData === 'object' ? Object.keys(itemsData) : [];

    categorySelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "ALL";
    allOption.textContent = "All Categories";
    categorySelect.appendChild(allOption);
    categories.forEach(cat => {
        const option = document.createElement("option");
        option.value = cat;
        option.textContent = cat;
        categorySelect.appendChild(option);
    });

    let currentCategory = "ALL";
    let currentSearch = "";

    function buildImageUrl(imagePath) {
        if (!imagePath) return "https://kb.veretech.systems/images/placeholder.png";
        
        // Remove leading "./" if present
        let cleanPath = imagePath.replace(/^\.\//, '');
        
        // Ensure it starts with the base URL and add .png
        return `https://kb.veretech.systems/${cleanPath}.png`;
    }
    
    function renderItemList() {
        itemList.classList.add("fade-out");
        setTimeout(() => {
            itemList.innerHTML = "";
            
            let categoriesToProcess = [];
            if (currentCategory === "ALL") {
                categoriesToProcess = categories;
            } else {
                categoriesToProcess = [currentCategory];
            }
            
            const term = currentSearch.toLowerCase();
            
            // Process each category
            categoriesToProcess.forEach(categoryName => {
                const categoryData = itemsData[categoryName];
                if (!categoryData) return;
                
                // Process each subcategory within the main category
                if (categoryData && typeof categoryData === 'object') {
                    Object.keys(categoryData).forEach(subcategoryName => {
                    // Skip PC (Player Console/Admin) items from being displayed
                    if (subcategoryName === "PC") {
                        return;
                    }
                    
                    const subcategoryItems = categoryData[subcategoryName];
                    
                    // Filter items based on search term
                    const filteredItems = subcategoryItems.filter(item => 
                        item.name.toLowerCase().includes(term) || 
                        item.id.toLowerCase().includes(term)
                    );
                    
                    if (filteredItems.length === 0) return;
                    
                    // Create subcategory header (only if showing multiple categories or multiple subcategories)
                    if (currentCategory === "ALL" || (categoryData && Object.keys(categoryData).length > 1)) {
                        const subcategoryHeader = document.createElement("div");
                        subcategoryHeader.classList.add("subcategory-header");
                        subcategoryHeader.textContent = currentCategory === "ALL" 
                            ? `${categoryName} - ${subcategoryName}` 
                            : subcategoryName;
                        itemList.appendChild(subcategoryHeader);
                    }
                    
                    // Create items for this subcategory
                    filteredItems.forEach(item => {
                        const itemDiv = document.createElement("div");
                        itemDiv.classList.add("item");
                        itemDiv.draggable = true;
                        itemDiv.dataset.itemId = item.id;
                        itemDiv.dataset.itemName = item.name;

                        const img = document.createElement("img");
                        img.src = buildImageUrl(item.image);
                        img.alt = item.name;
                        img.onerror = () => {
                            img.src = "https://kb.veretech.systems/images/placeholder.png";
                        };
                        itemDiv.appendChild(img);

                        const nameSpan = document.createElement("span");
                        nameSpan.classList.add("item-name");
                        nameSpan.textContent = item.name;
                        itemDiv.appendChild(nameSpan);

                        if (selectedItemData && selectedItemData.id === item.id) {
                            itemDiv.classList.add("selected");
                        }

                        itemDiv.addEventListener("dragstart", (ev) => {
                            ev.dataTransfer.setData("text/plain", JSON.stringify({
                                id: item.id,
                                name: item.name
                            }));
                        });

                        itemDiv.addEventListener("click", () => {
                            document.querySelectorAll(".item.selected").forEach(elem => {
                                elem.classList.remove("selected");
                            });
                            selectedItemData = { id: item.id, name: item.name };
                            itemDiv.classList.add("selected");
                        });

                        itemList.appendChild(itemDiv);
                    });
                    });
                }
            });
            
            itemList.classList.remove("fade-out");
            itemList.classList.add("fade-in");
            setTimeout(() => {
                itemList.classList.remove("fade-in");
            }, 300);
        }, 300);
    }

    categorySelect.addEventListener("change", (e) => {
        currentCategory = e.target.value;
        renderItemList();
    });

    searchInput.addEventListener("input", (e) => {
        currentSearch = e.target.value;
        renderItemList();
    });

    renderItemList();

    function handleItemDrop(slot, data) {
        // If this is a drag from another slot, we need to handle it differently
        if (data.slotType !== undefined && data.slotIndex !== undefined) {
            // Clear the source slot
            const sourceSlot = document.querySelector(`.slot[data-slot-type="${data.slotType}"][data-slot-index="${data.slotIndex}"]`);
            if (sourceSlot) {
                sourceSlot.innerHTML = "";
                delete sourceSlot.dataset.itemId;
                delete sourceSlot.dataset.itemName;
                updateWearLockStatus();
            }
            // Update the target slot with the dragged item
            const itemData = {
                id: data.itemId,
                name: data.itemName
            };
            handleItemDrop(slot, itemData);
            return;
        }

        if (slot.dataset.slotType === "wear") {
            if (data.id.toLowerCase().includes("backpack")) {
                Toast.error("Backpacks cannot go in the wear bar!");
                return;
            }
            if (lockWearItems.some(item => item.toLowerCase() === data.id.toLowerCase())) {
                document.querySelectorAll('.slot[data-slot-type="wear"]').forEach(ws => {
                    ws.innerHTML = "";
                    delete ws.dataset.itemId;
                    delete ws.dataset.itemName;
                });
                wearLocked = true;
            } else {
                if (wearLocked) {
                    Toast.error("Wear bar is locked by a full suit.");
                    return;
                }
                // Check if item is in ATTIRE category by searching through all subcategories (excluding Horse items)
                let isAttire = false;
                if (window.items && window.items["ATTIRE"]) {
                    for (const subcat in window.items["ATTIRE"]) {
                        // Skip Horse subcategory as horse items cannot be worn by players
                        if (subcat === "Horse") continue;
                        
                        if (Array.isArray(window.items["ATTIRE"][subcat])) {
                            const found = window.items["ATTIRE"][subcat].find(i => i.id.toLowerCase() === data.id.toLowerCase());
                            if (found) {
                                isAttire = true;
                                break;
                            }
                        }
                    }
                }
                const isExtraWearable = extraWearables.some(item => item.toLowerCase() === data.id.toLowerCase());
                if (!isAttire && !isExtraWearable) {
                    Toast.error(`"${data.name}" cannot be placed in wear slots. Only Attire or special wearable items are allowed.`);
                    return;
                }
                for (const group of conflictingArmorGroups) {
                    if (group.some(item => item.toLowerCase() === data.id.toLowerCase())) {
                        for (const item of group) {
                            const itemSlot = document.querySelector(`.slot[data-slot-type="wear"][data-itemId]`);
                            if (itemSlot && itemSlot.dataset.itemId.toLowerCase() === item.toLowerCase()) {
                                Toast.error(`Cannot wear ${data.id} with ${item}`);
                                return;
                            }
                        }
                    }
                }
            }
        }

        slot.innerHTML = "";
        slot.style.position = "relative";

        const slotItem = document.createElement("div");
        slotItem.classList.add("slot-item");
        slotItem.draggable = true; // Make the slot item draggable

        const slotImg = document.createElement("img");
        slotImg.classList.add("slotted-item");
        slotImg.alt = data.name;
        /*const fullImagePath = findItemImagePath(data.id);
        if (fullImagePath) {
            slotImg.src = fullImagePath + ".png";
            slotImg.onerror = () => {
                slotImg.src = "https://kb.veretech.systems/images/placeholder.png";
            };
        }*/
        slotImg.src = buildImageUrl(findItemImagePath(data.id));
        slotImg.onerror = () => {
            slotImg.src = "https://kb.veretech.systems/images/placeholder.png";
        };
        slotItem.appendChild(slotImg);

        const qtyInput = document.createElement("input");
        qtyInput.type = "number";
        qtyInput.classList.add("qty-input");
        qtyInput.value = 1;
        qtyInput.min = 1;
        qtyInput.addEventListener("click", (e) => {
            e.stopPropagation();
        });
        if (slot.dataset.slotType === "wear") {
            qtyInput.disabled = true;
        } else {
            qtyInput.addEventListener("change", () => {
                output.value = generateCommands();
            });
        }
        slotItem.appendChild(qtyInput);

        slot.appendChild(slotItem);

        // Add dragstart event to the slot item
        slotItem.addEventListener("dragstart", (ev) => {
            ev.dataTransfer.setData("text/plain", JSON.stringify({
                itemId: slot.dataset.itemId,
                itemName: slot.dataset.itemName,
                slotType: slot.dataset.slotType,
                slotIndex: slot.dataset.slotIndex
            }));
        });

        const removeBtn = document.createElement("button");
        removeBtn.classList.add("remove-item");
        removeBtn.textContent = "x";
        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            slot.innerHTML = "";
            delete slot.dataset.itemId;
            delete slot.dataset.itemName;
            updateWearLockStatus();
            output.value = generateCommands();
        });
        slot.appendChild(removeBtn);

        slotItem.addEventListener("dragend", (ev) => {
            if (ev.dataTransfer.dropEffect === "none") {
                slot.innerHTML = "";
                delete slot.dataset.itemId;
                delete slot.dataset.itemName;
                updateWearLockStatus();
                output.value = generateCommands();
            }
        });

        slot.dataset.itemId = data.id;
        slot.dataset.itemName = data.name;
        output.value = generateCommands();
    }

    const slots = document.querySelectorAll(".slot");
    slots.forEach(slot => {
        slot.addEventListener("dragover", (e) => {
            e.preventDefault();
            // Add visual feedback for valid drop targets
            const slotItem = slot.querySelector(".slot-item");
            if (!slotItem) {
                slot.style.borderColor = "var(--accent-neon)";
                slot.style.boxShadow = "0 0 10px var(--accent-neon)";
            }
        });

        slot.addEventListener("dragleave", (e) => {
            e.preventDefault();
            // Remove visual feedback when leaving drop target
            const slotItem = slot.querySelector(".slot-item");
            if (!slotItem) {
                slot.style.borderColor = "";
                slot.style.boxShadow = "";
            }
        });

        slot.addEventListener("drop", (e) => {
            e.preventDefault();
            // Remove visual feedback after drop
            slot.style.borderColor = "";
            slot.style.boxShadow = "";
            
            let data;
            try {
                data = JSON.parse(e.dataTransfer.getData("text/plain"));
            } catch (err) {
                return;
            }
            handleItemDrop(slot, data);
        });
    });

    function handleSlotPlacement(slot) {
        if (!selectedItemData) {
            return; // No item selected, do nothing
        }
        const data = { id: selectedItemData.id, name: selectedItemData.name };
        handleItemDrop(slot, data);
        selectedItemData = null;
        document.querySelectorAll(".item.selected").forEach(elem => {
            elem.classList.remove("selected");
        });
    }

    slots.forEach(slot => {
        slot.addEventListener("click", () => handleSlotPlacement(slot));
    });

    function findItemImagePath(itemId) {
        if (!window.items) return null;
        for (let cat of categories) {
            if (window.items[cat]) {
                // Handle nested structure where categories contain subcategories
                if (Array.isArray(window.items[cat])) {
                    const found = window.items[cat].find(i => i.id.toLowerCase() === itemId.toLowerCase());
                    if (found) return found.image;
                } else {
                    // Handle subcategories
                    for (const subcat in window.items[cat]) {
                        if (Array.isArray(window.items[cat][subcat])) {
                            const found = window.items[cat][subcat].find(i => i.id.toLowerCase() === itemId.toLowerCase());
                            if (found) return found.image;
                        }
                    }
                }
            }
        }
        return null;
    }

    function generateCommands() {
        const kitName = kitInput.value.trim() || "MyKit";
        const allSlots = document.querySelectorAll(".slot");
        let commands = [];
        allSlots.forEach(slot => {
            const itemId = slot.dataset.itemId;
            if (itemId) {
                let container = "main";
                if (slot.dataset.slotType === "wear") container = "wear";
                else if (slot.dataset.slotType === "hotbar") container = "belt";
                
                let qty = 1;
                const qtyInput = slot.querySelector(".qty-input");
                if (qtyInput && slot.dataset.slotType !== "wear") {
                    qty = parseInt(qtyInput.value, 10) || 1;
                }
                
                commands.push(`kit add "${kitName}" "${itemId}" ${qty} 1 ${container}`);
            }
        });
        return commands.join("\n");
    }

    clearAll.addEventListener("click", () => {
        slots.forEach(slot => {
            slot.innerHTML = "";
            delete slot.dataset.itemId;
            delete slot.dataset.itemName;
        });
        wearLocked = false;
        output.value = "";
        kitInput.value = "";
    });

    copyCommands.addEventListener("click", () => {
        const commands = generateCommands();
        output.value = commands;
        output.select();
        document.execCommand("copy");
        Toast.success("Commands copied to clipboard!");
    });

    copyInstallCode.addEventListener("click", () => {
        const commands = generateCommands();
        const base64 = btoa(commands);
        output.value = base64;
        output.select();
        document.execCommand("copy");
        Toast.success("Base64 Install Code copied to clipboard!");
    });
});
