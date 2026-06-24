// Register Service Worker for PWA/Offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      console.log('SW registered: ', reg.scope);
    }).catch(err => console.log('SW registration failed: ', err));
  });
}

document.addEventListener('DOMContentLoaded', () => {

  const sections = ["Interior", "Kitchen", "Bathrooms", "Systems & Structure", "Exterior", "Summary"];
  let activeSection = "Interior";

  const tabsContainer = document.getElementById('category-tabs');
  const roomsContainer = document.getElementById('rooms-container');
  const projectNameDisplay = document.getElementById('project-name-display');
  const projectLocationDisplay = document.getElementById('project-location-display');
  const btnEditLocation = document.getElementById('btn-edit-location');

  const progressBar = document.getElementById('progress-bar');
  const searchInput = document.getElementById('search-input');
  const searchBarContainer = document.getElementById('search-bar-container');
  const tabsContainerWrapper = document.getElementById('tabs-container-wrapper');
  const globalFooter = document.getElementById('global-footer');

  // Header Nav Actions
  const btnBack = document.getElementById('btn-back');
  const btnSave = document.getElementById('btn-save');
  const saveToast = document.getElementById('save-toast');
  const btnProjects = document.getElementById('btn-projects');
  const btnSettings = document.getElementById('btn-settings');

  // Welcome Screen
  const welcomeScreen = document.getElementById('welcome-screen');
  const welcomeBtnNew = document.getElementById('welcome-btn-new');
  const welcomeProjectsList = document.getElementById('welcome-projects-list');

  // Modals & Action Bar
  const projectsModal = document.getElementById('projects-modal');
  const closeProjects = document.getElementById('close-projects');
  const btnNewProject = document.getElementById('btn-new-project');
  const projectsList = document.getElementById('projects-list');

  const settingsModal = document.getElementById('settings-modal');
  const closeSettings = document.getElementById('close-settings');
  
  const pricingModal = document.getElementById('pricing-modal');
  const closePricingModal = document.getElementById('close-pricing-modal');
  const pricingEditorList = document.getElementById('pricing-editor-list');
  const pricingSearch = document.getElementById('pricing-search');
  const btnManualPricing = document.getElementById('btn-manual-pricing');
  const btnUploadCsv = document.getElementById('btn-upload-csv');
  const csvInput = document.getElementById('pricing-csv-input');

  const btnCamera = document.getElementById('btn-camera');
  const photoInput = document.getElementById('photo-input');
  
  const photosModal = document.getElementById('photos-modal');
  const closePhotos = document.getElementById('close-photos');
  const photosGrid = document.getElementById('photos-grid');

  let searchQuery = "";
  let currentPhotoTarget = null; // { section, room, id } or null for global project photo
  let expandedGroups = {}; // Tracks accordion state: { "Interior": { "Bathroom 1": { "Flooring": true } } }

  // --- THEME LOGIC ---
  const htmlEl = document.documentElement;
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      htmlEl.classList.add('dark');
    } else if (theme === 'light') {
      htmlEl.classList.remove('dark');
    } else {
      // System
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        htmlEl.classList.add('dark');
      } else {
        htmlEl.classList.remove('dark');
      }
    }
    
    // Update theme buttons UI
    document.querySelectorAll('.theme-btn').forEach(btn => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('bg-primary-500', 'text-white', 'shadow-md');
        btn.classList.remove('text-slate-600', 'dark:text-slate-400');
      } else {
        btn.classList.remove('bg-primary-500', 'text-white', 'shadow-md');
        btn.classList.add('text-slate-600', 'dark:text-slate-400');
      }
    });
  }

  // Listen for OS theme changes if set to system
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (store.state.appTheme === 'system') {
      applyTheme('system');
    }
  });

  // --- CUSTOM INPUT MODAL ---
  const inputModal = document.getElementById('input-modal');
  
  // New Project Modal
  const newProjectModal = document.getElementById('new-project-modal');
  const newProjectName = document.getElementById('new-project-name');
  const newProjectLocation = document.getElementById('new-project-location');
  const btnFetchLocation = document.getElementById('btn-fetch-location');
  const newProjectCancel = document.getElementById('new-project-cancel');
  const newProjectConfirm = document.getElementById('new-project-confirm');
  
  // Edit Project Modal
  const editProjectModal = document.getElementById('edit-project-modal');
  const editProjectName = document.getElementById('edit-project-name');
  const editProjectLocation = document.getElementById('edit-project-location');
  const btnEditFetchLocation = document.getElementById('btn-edit-fetch-location');
  const editProjectCancel = document.getElementById('edit-project-cancel');
  const editProjectConfirm = document.getElementById('edit-project-confirm');
  const inputModalTitle = document.getElementById('input-modal-title');
  const inputModalValue = document.getElementById('input-modal-value');
  const inputModalCancel = document.getElementById('input-modal-cancel');
  const inputModalConfirm = document.getElementById('input-modal-confirm');
  
  let inputModalCallback = null;

  function showNewProjectModal(callback) {
    newProjectName.value = "Project " + (store.state.projects.length + 1);
    newProjectLocation.value = "";
    newProjectModal.classList.remove('hidden');

    const handleCancel = () => {
      newProjectModal.classList.add('hidden');
      cleanup();
    };

    const handleConfirm = () => {
      const name = newProjectName.value.trim() || "New Project";
      const loc = newProjectLocation.value.trim();
      newProjectModal.classList.add('hidden');
      cleanup();
      callback(name, loc);
    };

    const handleFetchLocation = () => {
      btnFetchLocation.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const data = await response.json();
            if (data && data.display_name) {
              newProjectLocation.value = data.display_name;
            } else {
              newProjectLocation.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            }
          } catch (e) {
            newProjectLocation.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          }
          btnFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
        }, (error) => {
          alert("Unable to fetch location: " + error.message);
          btnFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
        });
      } else {
        alert("Geolocation is not supported by your browser");
        btnFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
      }
    };

    const cleanup = () => {
      newProjectCancel.removeEventListener('click', handleCancel);
      newProjectConfirm.removeEventListener('click', handleConfirm);
      btnFetchLocation.removeEventListener('click', handleFetchLocation);
    };

    newProjectCancel.addEventListener('click', handleCancel);
    newProjectConfirm.addEventListener('click', handleConfirm);
    btnFetchLocation.addEventListener('click', handleFetchLocation);
  }

  function setupLocationAutocomplete(inputEl, containerEl) {
    const suggestionsDiv = document.createElement('div');
    suggestionsDiv.className = 'absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto hidden';
    containerEl.classList.add('relative');
    containerEl.appendChild(suggestionsDiv);

    let timeout = null;
    inputEl.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      if (query.length < 3) {
        suggestionsDiv.classList.add('hidden');
        return;
      }
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5`);
          const data = await res.json();
          suggestionsDiv.innerHTML = '';
          if (data && data.length > 0) {
            data.forEach(item => {
              const div = document.createElement('div');
              div.className = 'px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0';
              div.innerText = item.display_name;
              div.onclick = () => {
                inputEl.value = item.display_name;
                suggestionsDiv.classList.add('hidden');
              };
              suggestionsDiv.appendChild(div);
            });
            suggestionsDiv.classList.remove('hidden');
          } else {
            suggestionsDiv.classList.add('hidden');
          }
        } catch (err) {
          console.error(err);
        }
      }, 500);
    });

    document.addEventListener('click', (e) => {
      if (!containerEl.contains(e.target)) {
        suggestionsDiv.classList.add('hidden');
      }
    });
  }

  setupLocationAutocomplete(newProjectLocation, newProjectLocation.parentElement);
  setupLocationAutocomplete(editProjectLocation, editProjectLocation.parentElement);

  function showEditProjectModal(project, callback) {
    editProjectName.value = project.name || "";
    editProjectLocation.value = project.location || "";
    editProjectModal.classList.remove('hidden');

    const handleCancel = () => {
      editProjectModal.classList.add('hidden');
      cleanup();
    };

    const handleConfirm = () => {
      const name = editProjectName.value.trim() || project.name;
      const loc = editProjectLocation.value.trim();
      editProjectModal.classList.add('hidden');
      cleanup();
      callback(name, loc);
    };

    const handleFetchLocation = () => {
      btnEditFetchLocation.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`);
            const data = await response.json();
            if (data && data.display_name) {
              editProjectLocation.value = data.display_name;
            } else {
              editProjectLocation.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
            }
          } catch (e) {
            editProjectLocation.value = `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
          }
          btnEditFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
        }, (error) => {
          alert("Unable to fetch location: " + error.message);
          btnEditFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
        });
      } else {
        alert("Geolocation is not supported by your browser");
        btnEditFetchLocation.innerHTML = '<i class="fas fa-location-arrow"></i>';
      }
    };

    const cleanup = () => {
      editProjectCancel.removeEventListener('click', handleCancel);
      editProjectConfirm.removeEventListener('click', handleConfirm);
      btnEditFetchLocation.removeEventListener('click', handleFetchLocation);
    };

    editProjectCancel.addEventListener('click', handleCancel);
    editProjectConfirm.addEventListener('click', handleConfirm);
    btnEditFetchLocation.addEventListener('click', handleFetchLocation);
  }

  function showInputModal(title, defaultValue, callback) {
    if (!inputModal) return;
    inputModalTitle.innerText = title;
    inputModalValue.value = defaultValue;
    inputModal.classList.remove('hidden');
    inputModal.classList.add('flex');
    inputModalValue.focus();
    inputModalValue.select();
    inputModalCallback = callback;
  }

  if (inputModalCancel) {
    inputModalCancel.onclick = () => {
      inputModal.classList.add('hidden');
      inputModal.classList.remove('flex');
      inputModalCallback = null;
    };
  }

  if (inputModalConfirm) {
    inputModalConfirm.onclick = () => {
      const val = inputModalValue.value.trim();
      if (val && inputModalCallback) {
        inputModalCallback(val);
      }
      inputModal.classList.add('hidden');
      inputModal.classList.remove('flex');
      inputModalCallback = null;
    };
  }

  if (inputModalValue) {
    inputModalValue.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        inputModalConfirm.click();
      }
    });
  }

  // --- CUSTOM CONFIRM MODAL ---
  const confirmModal = document.getElementById('confirm-modal');
  const confirmModalTitle = document.getElementById('confirm-modal-title');
  const confirmModalMessage = document.getElementById('confirm-modal-message');
  const confirmModalCancel = document.getElementById('confirm-modal-cancel');
  const confirmModalOk = document.getElementById('confirm-modal-ok');
  
  let confirmModalCallback = null;

  function showConfirmModal(title, message, callback, okText = "Delete") {
    if (!confirmModal) return;
    confirmModalTitle.innerText = title;
    confirmModalMessage.innerText = message;
    if (confirmModalOk) confirmModalOk.innerText = okText;
    confirmModal.classList.remove('hidden');
    confirmModal.classList.add('flex');
    confirmModalCallback = callback;
  }

  if (confirmModalCancel) {
    confirmModalCancel.onclick = () => {
      confirmModal.classList.add('hidden');
      confirmModal.classList.remove('flex');
      confirmModalCallback = null;
    };
  }

  if (confirmModalOk) {
    confirmModalOk.onclick = () => {
      if (confirmModalCallback) {
        confirmModalCallback();
      }
      confirmModal.classList.add('hidden');
      confirmModal.classList.remove('flex');
      confirmModalCallback = null;
    };
  }

  // --- BOOT & WELCOME LOGIC ---
  function boot() {
    applyTheme(store.state.appTheme || 'system');
    renderWelcomeScreen();
  }

  function renderWelcomeScreen() {
    document.querySelectorAll('body > .dropdown-menu').forEach(el => el.remove());
    welcomeScreen.classList.remove('hidden');
    welcomeScreen.style.display = 'flex';
    welcomeProjectsList.innerHTML = '';
    
    // Hide App UI elements completely to prevent them showing during overscroll rubber-banding
    document.querySelector('header').classList.add('hidden');
    document.getElementById('search-bar-container').classList.add('hidden');
    document.getElementById('tabs-container-wrapper').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
    document.getElementById('global-footer').classList.add('hidden');
    
    if (store.state.projects.length === 0) {
      welcomeProjectsList.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm italic text-center mt-4">No recent projects.</p>';
    } else {
      store.state.projects.forEach(p => {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl mb-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex justify-between items-center shadow-sm group';
        
        const textBtn = document.createElement('button');
        textBtn.className = 'flex-1 text-left font-bold text-slate-800 dark:text-white truncate pr-4 outline-none';
        textBtn.innerText = p.name;
        textBtn.onclick = () => {
          store.switchProject(p.id);
          startProject();
        };

        const menuContainer = document.createElement('div');
        menuContainer.className = 'relative';
        
        const moreBtn = document.createElement('button');
        moreBtn.className = 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 outline-none opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity';
        moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 hidden z-[500] overflow-hidden dropdown-menu';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700';
        editBtn.innerHTML = '<i class="fas fa-edit w-4 text-center"></i> <span>Edit Details</span>';
        editBtn.onclick = (e) => {
          e.stopPropagation();
          dropdown.classList.add('hidden');
          showEditProjectModal(p, (name, loc) => {
            store.updateProjectDetails(p.id, name, loc);
            renderWelcomeScreen();
          });
        };
        
        const delBtn = document.createElement('button');
        delBtn.className = 'w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2';
        delBtn.innerHTML = '<i class="fas fa-trash w-4 text-center"></i> <span>Delete</span>';
        delBtn.onclick = (e) => {
          e.stopPropagation();
          dropdown.classList.add('hidden');
          showConfirmModal("Delete Project", `Are you sure you want to permanently delete "${p.name}"?`, () => {
            store.deleteProject(p.id);
            renderWelcomeScreen();
          });
        };
        
        dropdown.appendChild(editBtn);
        dropdown.appendChild(delBtn);
        menuContainer.appendChild(moreBtn);
        
        // Append dropdown to body to avoid overflow clipping
        document.body.appendChild(dropdown);
        
        moreBtn.onclick = (e) => {
          e.stopPropagation();
          document.querySelectorAll('.dropdown-menu').forEach(m => {
            if (m !== dropdown) m.classList.add('hidden');
          });
          
          if (dropdown.classList.contains('hidden')) {
            const rect = moreBtn.getBoundingClientRect();
            dropdown.style.position = 'fixed';
            // Check if there is enough space below, otherwise show above
            if (rect.bottom + 120 > window.innerHeight) {
              dropdown.style.top = `${rect.top - 100}px`;
            } else {
              dropdown.style.top = `${rect.bottom + 8}px`;
            }
            dropdown.style.left = `${Math.max(8, rect.right - 192)}px`;
            dropdown.classList.remove('hidden');
          } else {
            dropdown.classList.add('hidden');
          }
        };

        btnContainer.appendChild(textBtn);
        btnContainer.appendChild(menuContainer);
        welcomeProjectsList.appendChild(btnContainer);
      });
    }
  }

  welcomeBtnNew.onclick = () => {
    showNewProjectModal((name, location) => {
      store.createProject(name, location);
      startProject();
    });
  };

  btnBack.onclick = () => {
    renderWelcomeScreen();
  };

  btnSave.onclick = () => {
    store.saveState();
    saveToast.classList.remove('opacity-0');
    setTimeout(() => {
      saveToast.classList.add('opacity-0');
    }, 2000);
  };

  function startProject() {
    // Reveal App UI elements
    document.querySelector('header').classList.remove('hidden');
    document.getElementById('search-bar-container').classList.remove('hidden');
    document.getElementById('tabs-container-wrapper').classList.remove('hidden');
    document.getElementById('main-content').classList.remove('hidden');
    document.getElementById('global-footer').classList.remove('hidden');
    
    welcomeScreen.style.opacity = '0';
    setTimeout(() => {
      welcomeScreen.style.display = 'none';
      welcomeScreen.classList.add('hidden');
      welcomeScreen.style.opacity = '1';
    }, 300);
    
    projectNameDisplay.innerText = store.getCurrentProject().name;
    projectLocationDisplay.innerText = store.getCurrentProject().location || "Add Location";
    searchInput.value = "";
    searchQuery = "";
    activeSection = "Interior";
    expandedGroups = {}; // reset accordion tracker
    
    btnBack.classList.remove('hidden');
    btnSave.classList.remove('hidden');
    btnSave.classList.add('flex');

    renderTabs();
    renderContent();
    updateGlobalState();
  }

  // --- SETTINGS & PRICING ---
  btnSettings.addEventListener('click', () => {
    settingsModal.classList.remove('hidden');
    applyTheme(store.state.appTheme || 'system');
  });
  
  closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.onclick = (e) => {
      const theme = e.currentTarget.dataset.theme;
      store.setTheme(theme);
      applyTheme(theme);
    };
  });

  // CSV Parser for Base Prices
  btnUploadCsv.onclick = () => csvInput.click();
  csvInput.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      parsePricingCSV(text);
      csvInput.value = ""; // Reset input
    };
    reader.readAsText(file);
  };

  function parsePricingCSV(csvText) {
    const lines = csvText.split('\n');
    let updateCount = 0;
    
    const nameMap = {};
    for (const sec in pricingData) {
      for (const group in pricingData[sec]) {
        pricingData[sec][group].forEach(item => {
          nameMap[item.name.toLowerCase().trim()] = { section: sec, id: item.id };
        });
      }
    }

    lines.forEach(line => {
      if (!line.trim()) return;
      // Basic CSV split, ignores commas inside quotes
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 2) return;
      
      let matchedInfo = null;
      let parsedRate = null;
      
      const normalizedRow = line.toLowerCase();
      for (const [name, info] of Object.entries(nameMap)) {
        if (normalizedRow.includes(name)) {
          matchedInfo = info;
          break;
        }
      }

      if (matchedInfo) {
        for (let i = 1; i < parts.length; i++) {
          let strVal = parts[i].replace(/[^0-9.]/g, '');
          let val = parseFloat(strVal);
          if (!isNaN(val) && val > 0 && strVal.length < 10) { 
            parsedRate = val;
            break; // take first valid number as price
          }
        }
        if (parsedRate !== null) {
          store.setCustomPrice(matchedInfo.section, matchedInfo.id, parsedRate);
          updateCount++;
        }
      }
    });
    
    alert(`Successfully updated prices for ${updateCount} items from CSV!`);
    renderContent();
  }

  // Manual Pricing Editor
  btnManualPricing.onclick = () => {
    settingsModal.classList.add('hidden');
    pricingModal.classList.remove('hidden');
    pricingSearch.value = "";
    renderPricingEditor("");
  };

  closePricingModal.onclick = () => {
    pricingModal.classList.add('hidden');
    renderContent();
    updateGlobalState();
  };

  pricingSearch.oninput = (e) => {
    renderPricingEditor(e.target.value.toLowerCase());
  };

  function renderPricingEditor(query) {
    pricingEditorList.innerHTML = '';
    
    for (const section in pricingData) {
      if (section === 'Summary') continue;
      
      for (const group in pricingData[section]) {
        const items = pricingData[section][group];
        items.forEach(item => {
          if (query && !item.name.toLowerCase().includes(query) && !group.toLowerCase().includes(query)) return;
          
          const currentCost = store.getItemCost(section, item.id);
          const isCustom = store.state.customPricing && store.state.customPricing[section] && store.state.customPricing[section][item.id] !== undefined;

          const row = document.createElement('div');
          row.className = 'px-4 py-3 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center';
          row.innerHTML = `
            <div class="flex-1 pr-4">
              <div class="text-sm font-bold text-slate-800 dark:text-slate-200">${item.name}</div>
              <div class="text-xs text-slate-500 dark:text-slate-400">${section} > ${group}</div>
            </div>
            <div class="flex items-center space-x-2 shrink-0">
              <span class="text-[10px] bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 font-bold px-1.5 py-0.5 rounded ${isCustom ? '' : 'hidden'}">CUSTOM</span>
              <div class="flex items-center bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-600 px-2 py-1">
                <span class="text-slate-400 mr-1 text-sm">$</span>
                <input type="number" class="w-16 bg-transparent text-right outline-none font-mono text-sm dark:text-white pricing-edit-input" data-section="${section}" data-id="${item.id}" value="${currentCost.toFixed(2)}" step="0.01">
              </div>
            </div>
          `;
          pricingEditorList.appendChild(row);
        });
      }
    }

    document.querySelectorAll('.pricing-edit-input').forEach(input => {
      input.onchange = (e) => {
        const section = e.target.dataset.section;
        const id = e.target.dataset.id;
        const val = parseFloat(e.target.value) || 0;
        store.setCustomPrice(section, id, val);
        renderPricingEditor(query);
      };
    });
  }

  // --- PROJECTS MANAGEMENT ---
  btnProjects.addEventListener('click', () => {
    renderProjectsList();
    projectsModal.classList.add('hidden');
  });

  closeProjects.addEventListener('click', () => {
    projectsModal.classList.add('hidden');
  });

  btnNewProject.addEventListener('click', () => {
    showNewProjectModal((name, location) => {
      store.createProject(name, location);
      projectsModal.classList.add('hidden');
      startProject();
    });
  });

  if (btnEditLocation) {
    btnEditLocation.addEventListener('click', () => {
      const project = store.getCurrentProject();
      if (!project) return;
      showEditProjectModal(project, (newName, newLocation) => {
        store.updateProjectDetails(project.id, newName, newLocation);
        startProject();
      });
    });
  }

  function renderProjectsList() {
    document.querySelectorAll('body > .dropdown-menu').forEach(el => el.remove());
    projectsList.innerHTML = '';
    store.state.projects.forEach(p => {
      const isCurrent = p.id === store.state.currentProjectId;
      const el = document.createElement('div');
      el.className = `flex justify-between items-center p-3 rounded-lg border ${isCurrent ? 'border-primary-500 dark:border-primary-500 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`;
      
      const nameBtn = document.createElement('button');
      nameBtn.className = `flex-1 text-left font-bold truncate ${isCurrent ? 'text-primary-700 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'}`;
      nameBtn.innerText = p.name;
      nameBtn.onclick = () => {
        store.switchProject(p.id);
        projectsModal.classList.add('hidden');
        startProject();
      };
      
      const menuContainer = document.createElement('div');
      menuContainer.className = 'relative group';
      
      const moreBtn = document.createElement('button');
      moreBtn.className = 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-2 py-1 outline-none';
      moreBtn.innerHTML = '<i class="fas fa-ellipsis-v"></i>';
      
      const dropdown = document.createElement('div');
      dropdown.className = 'w-48 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 hidden z-[500] overflow-hidden dropdown-menu';
      
      const editBtn = document.createElement('button');
      editBtn.className = 'w-full text-left px-4 py-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center space-x-2 border-b border-slate-100 dark:border-slate-700';
      editBtn.innerHTML = '<i class="fas fa-edit w-4 text-center"></i> <span>Edit Details</span>';
      editBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        showEditProjectModal(p, (name, loc) => {
          store.updateProjectDetails(p.id, name, loc);
          renderProjectsList();
        });
      };
      
      const delBtn = document.createElement('button');
      delBtn.className = 'w-full text-left px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center space-x-2';
      delBtn.innerHTML = '<i class="fas fa-trash w-4 text-center"></i> <span>Delete</span>';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        dropdown.classList.add('hidden');
        showConfirmModal("Delete Project", `Are you sure you want to permanently delete "${p.name}"?`, () => {
          store.deleteProject(p.id);
          if (store.state.projects.length === 0) {
            projectsModal.classList.add('hidden');
            renderWelcomeScreen();
          } else {
            renderProjectsList();
          }
        });
      };
      
      dropdown.appendChild(editBtn);
      dropdown.appendChild(delBtn);
      menuContainer.appendChild(moreBtn);
      
      // Append dropdown to body to avoid overflow clipping
      document.body.appendChild(dropdown);
      
      moreBtn.onclick = (e) => {
        e.stopPropagation();
        document.querySelectorAll('.dropdown-menu').forEach(m => {
          if (m !== dropdown) m.classList.add('hidden');
        });
        
        if (dropdown.classList.contains('hidden')) {
          const rect = moreBtn.getBoundingClientRect();
          dropdown.style.position = 'fixed';
          if (rect.bottom + 120 > window.innerHeight) {
            dropdown.style.top = `${rect.top - 100}px`;
          } else {
            dropdown.style.top = `${rect.bottom + 8}px`;
          }
          dropdown.style.left = `${Math.max(8, rect.right - 192)}px`;
          dropdown.classList.remove('hidden');
        } else {
          dropdown.classList.add('hidden');
        }
      };

      el.appendChild(nameBtn);
      el.appendChild(menuContainer);
      projectsList.appendChild(el);
    });
  }

  // --- NAVIGATION & SEARCH ---
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase();
    renderContent();
  });

  function renderTabs() {
    tabsContainer.innerHTML = '';
    sections.forEach(section => {
      const li = document.createElement('li');
      li.className = 'flex-shrink-0';
      const btn = document.createElement('button');
      btn.className = `px-4 py-3 text-sm font-semibold border-b-2 transition-colors duration-200 whitespace-nowrap ${activeSection === section ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`;
      
      if (section === 'Summary') {
        btn.innerHTML = `<i class="fas fa-chart-pie mr-2"></i>Summary`;
      } else {
        btn.innerText = section;
      }

      btn.onclick = () => {
        activeSection = section;
        renderTabs();
        renderContent();
      };
      li.appendChild(btn);
      tabsContainer.appendChild(li);
    });
  }

  function renderContent() {
    roomsContainer.innerHTML = '';
    const project = store.getCurrentProject();
    if (!project) return;

    if (activeSection === 'Summary') {
      searchBarContainer.classList.add('hidden');
      globalFooter.classList.add('hidden');
      renderSummary(project);
      return;
    } else {
      searchBarContainer.classList.remove('hidden');
      globalFooter.classList.remove('hidden');
    }

    const rooms = project.rooms[activeSection] || {};
    const roomNames = Object.keys(rooms);

    if (roomNames.length === 0) {
      roomsContainer.innerHTML = `<div class="text-center text-slate-500 mt-10">No rooms added to this section.</div>`;
    }

    if (!expandedGroups[activeSection]) expandedGroups[activeSection] = {};

    roomNames.forEach(roomName => {
      if (!expandedGroups[activeSection][roomName]) expandedGroups[activeSection][roomName] = {};

      let initialRoomTotal = 0;
      const storedRoomItems = project.rooms[activeSection][roomName].items || {};
      for (const id in storedRoomItems) {
        initialRoomTotal += storedRoomItems[id].quantity * store.getItemCost(activeSection, id);
      }

      const roomCard = document.createElement('div');
      roomCard.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-6 overflow-hidden slide-up-enter transition-colors duration-300';
      
      const roomHeader = document.createElement('div');
      roomHeader.className = 'bg-slate-50 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center';
      roomHeader.innerHTML = `
        <h3 class="font-bold text-slate-800 dark:text-white">${roomName}</h3>
        <span class="font-bold text-primary-600 dark:text-primary-500 text-lg room-total-display" data-room="${roomName}">$${initialRoomTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
      `;
      roomCard.appendChild(roomHeader);

      const itemsList = document.createElement('div');
      itemsList.className = 'divide-y divide-slate-100 dark:divide-slate-700';

      const groupData = pricingData[activeSection];
      for (const group in groupData) {
        
        const filteredItems = groupData[group].filter(item => item.name.toLowerCase().includes(searchQuery));
        if (filteredItems.length === 0) continue; 

        const groupHeader = document.createElement('button');
        groupHeader.className = 'w-full px-4 py-3 bg-slate-100 dark:bg-slate-800 flex justify-between items-center transition-colors hover:bg-slate-200 dark:hover:bg-slate-700';
        
        const isExpanded = searchQuery.length > 0 || !!expandedGroups[activeSection][roomName][group];
        
        groupHeader.innerHTML = `
          <span class="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">${group}</span>
          <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'} text-slate-400 text-xs transition-transform transform"></i>
        `;

        const groupContent = document.createElement('div');
        groupContent.className = isExpanded ? 'block' : 'hidden';

        groupHeader.onclick = () => {
          const isHidden = groupContent.classList.contains('hidden');
          if (isHidden) {
            groupContent.classList.remove('hidden');
            groupHeader.querySelector('i').classList.replace('fa-chevron-down', 'fa-chevron-up');
            expandedGroups[activeSection][roomName][group] = true;
          } else {
            groupContent.classList.add('hidden');
            groupHeader.querySelector('i').classList.replace('fa-chevron-up', 'fa-chevron-down');
            expandedGroups[activeSection][roomName][group] = false;
          }
        };
        itemsList.appendChild(groupHeader);

        filteredItems.forEach(item => {
          const storedItem = rooms[roomName].items[item.id] || { quantity: 0, comment: '', photos: [] };
          const qty = storedItem.quantity;
          const comment = storedItem.comment || '';
          const photos = storedItem.photos || [];
          const currentCost = store.getItemCost(activeSection, item.id);
          const total = qty * currentCost;
          const isActive = qty > 0;

          const itemRow = document.createElement('div');
          itemRow.className = `item-row px-4 py-3 flex items-start justify-between transition-colors ${isActive ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-white dark:bg-slate-800'}`;
          
          itemRow.innerHTML = `
            <div class="flex-1 pr-4">
              <div class="item-title text-sm font-semibold ${isActive ? 'text-primary-900 dark:text-primary-400' : 'text-slate-700 dark:text-slate-200'} leading-tight">${item.name}</div>
              <div class="item-subtitle text-xs ${isActive ? 'text-primary-600 dark:text-primary-300 font-medium' : 'text-slate-400 dark:text-slate-500'} mt-0.5">$${currentCost.toFixed(2)} / ${item.unit}</div>
              
              <div class="mt-2 flex space-x-3 items-center">
                <button class="btn-comment text-slate-400 hover:text-primary-600 transition-colors focus:outline-none" data-id="${item.id}" data-room="${roomName}" title="Add Comment">
                  <i class="fas fa-comment-alt"></i>
                </button>
                <button class="btn-item-camera text-slate-400 hover:text-primary-600 transition-colors focus:outline-none flex items-center" data-id="${item.id}" data-room="${roomName}" title="Attach Photo">
                  <i class="fas fa-camera"></i> 
                  <span class="text-[10px] ml-1 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-400 rounded-full px-1.5 py-0.5 font-bold ${photos.length > 0 ? 'inline-block' : 'hidden'}">${photos.length}</span>
                </button>
              </div>

              <textarea class="comment-input ${comment ? 'block' : 'hidden'} w-full mt-2 text-xs p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 dark:text-white focus:ring-1 focus:ring-primary-500 outline-none resize-none h-16" placeholder="Add a note..." data-id="${item.id}" data-room="${roomName}">${comment}</textarea>
            </div>
            <div class="flex flex-col items-end w-24 shrink-0 mt-1">
              <div class="item-total text-sm font-bold ${isActive ? 'text-primary-700 dark:text-primary-400' : 'text-slate-300 dark:text-slate-600'} mb-1">$${total.toFixed(2)}</div>
              <div class="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                <button class="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 transition-colors btn-decrement" data-id="${item.id}" data-room="${roomName}">
                  <i class="fas fa-minus text-xs"></i>
                </button>
                <input type="number" class="w-10 h-8 text-center text-base font-bold bg-transparent border-none focus:outline-none focus:ring-0 p-0 text-slate-800 dark:text-slate-100 qty-input" value="${qty}" min="0" data-id="${item.id}" data-room="${roomName}">
                <button class="w-8 h-8 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 active:bg-slate-300 transition-colors btn-increment" data-id="${item.id}" data-room="${roomName}">
                  <i class="fas fa-plus text-xs"></i>
                </button>
              </div>
            </div>
          `;
          groupContent.appendChild(itemRow);
        });

        itemsList.appendChild(groupContent);
      }

      roomCard.appendChild(itemsList);
      roomsContainer.appendChild(roomCard);
    });

    if (activeSection !== 'Summary') {
      const addRoomBtn = document.createElement('button');
      addRoomBtn.className = 'w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 font-semibold hover:border-primary-400 dark:hover:border-primary-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all flex items-center justify-center space-x-2';
      addRoomBtn.innerHTML = `<i class="fas fa-plus-circle"></i><span>Add ${activeSection} Room</span>`;
      addRoomBtn.onclick = () => {
        const roomCount = roomNames.length + 1;
        const defaultName = activeSection === 'Bathrooms' ? `Bathroom ${roomCount}` : 
                            activeSection === 'Kitchen' ? `Kitchen ${roomCount}` : 
                            `${activeSection} Area ${roomCount}`;
        showInputModal('Enter room name:', defaultName, (newName) => {
          store.addRoomInstance(project, activeSection, newName);
          store.saveState();
          renderContent();
          updateGlobalState();
        });
      };
      roomsContainer.appendChild(addRoomBtn);
    }

    attachEventListeners();
  }

  function renderSummary(project) {
    let grandTotal = 0;
    
    // UI Card Container
    const summaryCard = document.createElement('div');
    summaryCard.className = 'bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden slide-up-enter';
    
    const header = document.createElement('div');
    header.className = 'bg-slate-900 px-4 py-4 text-white text-center';
    header.innerHTML = `<h2 class="text-xl font-bold">Project Summary</h2><p class="text-slate-400 text-xs">${project.name}</p>`;
    summaryCard.appendChild(header);

    const body = document.createElement('div');
    body.className = 'p-0'; 

    const table = document.createElement('table');
    table.className = 'w-full text-left border-collapse bg-white dark:bg-slate-800';
    table.innerHTML = `
      <thead class="bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-200 dark:border-slate-700">
        <tr>
          <th class="p-3 hidden sm:table-cell">Section</th>
          <th class="p-3 w-1/2">Item Breakdown</th>
          <th class="p-3 text-right">Qty</th>
          <th class="p-3 text-right hidden sm:table-cell">Cost</th>
          <th class="p-3 text-right text-primary-600 dark:text-primary-500">Total</th>
        </tr>
      </thead>
      <tbody class="text-xs divide-y divide-slate-100 dark:divide-slate-700" id="summary-table-body">
      </tbody>
    `;
    body.appendChild(table);

    const tbody = table.querySelector('tbody');

    sections.forEach(sec => {
      if(sec === 'Summary') return;
      let secTotal = 0;
      let hasItems = false;
      let sectionRows = '';

      if (project.rooms[sec]) {
        for (const roomName in project.rooms[sec]) {
          const items = project.rooms[sec][roomName].items;
          for (const id in items) {
            const qty = items[id].quantity;
            if (qty > 0) {
              const cost = store.getItemCost(sec, id);
              const total = qty * cost;
              secTotal += total;
              hasItems = true;

              let itemName = "Unknown";
              if (pricingData[sec]) {
                for (const group in pricingData[sec]) {
                  const itemInfo = pricingData[sec][group].find(i => i.id === id);
                  if (itemInfo) itemName = itemInfo.name;
                }
              }

              const displayRoom = roomName === 'General' ? '' : `<span class="font-bold text-slate-900 dark:text-slate-100">${roomName}</span><span class="text-slate-400 dark:text-slate-500 mx-1">|</span>`;

              sectionRows += `
                <tr class="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <td class="p-3 font-semibold text-slate-400 hidden sm:table-cell border-r border-slate-50 dark:border-slate-700/50"></td>
                  <td class="p-3">
                    ${displayRoom}${itemName}
                  </td>
                  <td class="p-3 text-right font-mono text-slate-500 dark:text-slate-400">${qty}</td>
                  <td class="p-3 text-right font-mono text-slate-400 dark:text-slate-500 hidden sm:table-cell">$${cost.toFixed(2)}</td>
                  <td class="p-3 text-right font-bold text-slate-800 dark:text-slate-200">$${total.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        }
      }
      
      grandTotal += secTotal;
      
      if (hasItems) {
        const secHeaderRow = document.createElement('tr');
        secHeaderRow.className = 'bg-slate-50 dark:bg-slate-900/40 border-t-2 border-slate-200 dark:border-slate-600';
        secHeaderRow.innerHTML = `
          <td class="p-3 font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider" colspan="2">${sec}</td>
          <td class="p-3 hidden sm:table-cell"></td>
          <td class="p-3 text-right hidden sm:table-cell font-bold text-slate-400 uppercase text-[10px]">Section Total</td>
          <td class="p-3 text-right font-black text-primary-600 dark:text-primary-400">$${secTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        `;
        tbody.appendChild(secHeaderRow);
        tbody.insertAdjacentHTML('beforeend', sectionRows);
      }
    });

    if (grandTotal === 0) {
      body.innerHTML = `<div class="text-center text-slate-500 py-10">No items added to estimate yet.</div>`;
    } else {
      const grandTotalRow = document.createElement('div');
      grandTotalRow.className = 'p-4 bg-primary-50 dark:bg-primary-900/20 flex justify-between items-center border-t-4 border-primary-500 dark:border-primary-600';
      grandTotalRow.innerHTML = `<span class="font-black text-lg text-primary-900 dark:text-primary-100">GRAND TOTAL</span><span class="font-black text-2xl text-primary-600 dark:text-primary-400">$${grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>`;
      body.appendChild(grandTotalRow);
    }

    summaryCard.appendChild(body);
    roomsContainer.appendChild(summaryCard);
    
    // Action Buttons - All Uniform Primary Orange!
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'mt-6 space-y-3 slide-up-enter pb-8';

    // Save All Button
    const saveBtn = document.createElement('button');
    saveBtn.className = 'w-full bg-primary-600 dark:bg-primary-800 text-white rounded-xl py-3 font-bold shadow hover:bg-primary-700 dark:hover:bg-primary-900 transition-colors flex items-center justify-center space-x-2';
    saveBtn.innerHTML = `<i class="fas fa-save"></i><span id="summary-save-text">Save All Changes</span>`;
    saveBtn.onclick = () => {
      store.saveState();
      saveBtn.querySelector('span').innerText = 'Saved Successfully!';
      setTimeout(() => saveBtn.querySelector('span').innerText = 'Save All Changes', 2000);
    };
    actionsContainer.appendChild(saveBtn);

    const divider = document.createElement('div');
    divider.className = 'text-center text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest py-2';
    divider.innerText = "Export Options";
    actionsContainer.appendChild(divider);

    // 1. Export ZIP
    const exportZipBtn = document.createElement('button');
    exportZipBtn.className = 'w-full bg-primary-600 dark:bg-primary-800 text-white rounded-xl py-3 font-bold shadow hover:bg-primary-700 dark:hover:bg-primary-900 transition-colors flex items-center justify-center space-x-2';
    exportZipBtn.innerHTML = `<i class="fas fa-file-archive"></i><span id="export-zip-text">Download Full Archive (ZIP)</span>`;
    exportZipBtn.onclick = () => exportProject();
    actionsContainer.appendChild(exportZipBtn);

    // 2. Export PDF
    const exportPdfBtn = document.createElement('button');
    exportPdfBtn.className = 'w-full bg-primary-600 dark:bg-primary-800 text-white rounded-xl py-3 font-bold shadow hover:bg-primary-700 dark:hover:bg-primary-900 transition-colors flex items-center justify-center space-x-2';
    exportPdfBtn.innerHTML = `<i class="fas fa-file-pdf"></i><span id="export-pdf-text">Download Summary (PDF)</span>`;
    exportPdfBtn.onclick = () => exportPDF(project.name);
    actionsContainer.appendChild(exportPdfBtn);

    // 3. Export CSV
    const exportCsvBtn = document.createElement('button');
    exportCsvBtn.className = 'w-full bg-primary-600 dark:bg-primary-800 text-white rounded-xl py-3 font-bold shadow hover:bg-primary-700 dark:hover:bg-primary-900 transition-colors flex items-center justify-center space-x-2';
    exportCsvBtn.innerHTML = `<i class="fas fa-file-excel"></i><span>Download Detailed Sheet (CSV)</span>`;
    exportCsvBtn.onclick = () => exportCSVOnly();
    actionsContainer.appendChild(exportCsvBtn);

    roomsContainer.appendChild(actionsContainer);
  }

  function attachEventListeners() {
    document.querySelectorAll('.btn-increment').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        const room = e.currentTarget.dataset.room;
        const input = document.querySelector(`input.qty-input[data-id="${id}"][data-room="${room}"]`);
        let val = parseFloat(input.value) || 0;
        val++;
        updateQuantity(id, room, val, input);
      };
    });

    document.querySelectorAll('.btn-decrement').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        const room = e.currentTarget.dataset.room;
        const input = document.querySelector(`input.qty-input[data-id="${id}"][data-room="${room}"]`);
        let val = parseFloat(input.value) || 0;
        if (val > 0) val--;
        updateQuantity(id, room, val, input);
      };
    });

    document.querySelectorAll('.qty-input').forEach(input => {
      input.onchange = (e) => {
        const id = e.target.dataset.id;
        const room = e.target.dataset.room;
        let val = parseFloat(e.target.value) || 0;
        if (val < 0) val = 0;
        updateQuantity(id, room, val, e.target);
      };
    });

    document.querySelectorAll('.btn-comment').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        const room = e.currentTarget.dataset.room;
        const textarea = document.querySelector(`textarea.comment-input[data-id="${id}"][data-room="${room}"]`);
        textarea.classList.toggle('hidden');
        if (!textarea.classList.contains('hidden')) textarea.focus();
      };
    });

    document.querySelectorAll('textarea.comment-input').forEach(textarea => {
      textarea.onblur = (e) => {
        const id = e.target.dataset.id;
        const room = e.target.dataset.room;
        store.setItemComment(activeSection, room, id, e.target.value);
      };
    });

    document.querySelectorAll('.btn-item-camera').forEach(btn => {
      btn.onclick = (e) => {
        const id = e.currentTarget.dataset.id;
        const room = e.currentTarget.dataset.room;
        openPhotosViewer(activeSection, room, id);
      };
    });
  }

  function updateQuantity(id, room, quantity, inputElement) {
    store.updateItemQuantity(activeSection, room, id, quantity);
    inputElement.value = quantity;
    
    const row = inputElement.closest('.item-row');
    const totalEl = row.querySelector('.item-total');
    const titleEl = row.querySelector('.item-title');
    const subtitleEl = row.querySelector('.item-subtitle');

    const cost = store.getItemCost(activeSection, id);
    const total = quantity * cost;
    totalEl.innerText = `$${total.toFixed(2)}`;

    const isActive = quantity > 0;
    
    if (isActive) {
      row.classList.add('bg-primary-50', 'dark:bg-primary-900/20');
      row.classList.remove('bg-white', 'dark:bg-slate-800');
      titleEl.classList.add('text-primary-900', 'dark:text-primary-400');
      titleEl.classList.remove('text-slate-700', 'dark:text-slate-200');
      subtitleEl.classList.add('text-primary-600', 'dark:text-primary-300', 'font-medium');
      subtitleEl.classList.remove('text-slate-400', 'dark:text-slate-500');
      totalEl.classList.add('text-primary-700', 'dark:text-primary-400');
      totalEl.classList.remove('text-slate-300', 'dark:text-slate-600');
    } else {
      row.classList.add('bg-white', 'dark:bg-slate-800');
      row.classList.remove('bg-primary-50', 'dark:bg-primary-900/20');
      titleEl.classList.add('text-slate-700', 'dark:text-slate-200');
      titleEl.classList.remove('text-primary-900', 'dark:text-primary-400');
      subtitleEl.classList.add('text-slate-400', 'dark:text-slate-500');
      subtitleEl.classList.remove('text-primary-600', 'dark:text-primary-300', 'font-medium');
      totalEl.classList.add('text-slate-300', 'dark:text-slate-600');
      totalEl.classList.remove('text-primary-700', 'dark:text-primary-400');
    }

    updateGlobalState();
  }

  function updateGlobalState() {
    const project = store.getCurrentProject();
    if (!project) return;

    // Update Total Display
    const total = store.getProjectTotal();
    const totalEl = document.getElementById('sticky-total');
    if (totalEl) {
      totalEl.innerText = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      totalEl.classList.remove('flash-update');
      void totalEl.offsetWidth;
      totalEl.classList.add('flash-update');
    }

    // Update Room Totals
    const roomDisplays = document.querySelectorAll('.room-total-display');
    roomDisplays.forEach(el => {
      const rName = el.getAttribute('data-room');
      let currentRoomTotal = 0;
      if (project.rooms[activeSection] && project.rooms[activeSection][rName]) {
        const items = project.rooms[activeSection][rName].items;
        for (const id in items) {
          currentRoomTotal += items[id].quantity * store.getItemCost(activeSection, id);
        }
      }
      el.innerText = `$${currentRoomTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}`;
    });

    // Update Progress Bar
    let totalGroupsCount = 0;
    let touchedGroupsCount = 0;

    for (const section in pricingData) {
      const sectionGroups = Object.keys(pricingData[section]);
      totalGroupsCount += sectionGroups.length;

      sectionGroups.forEach(group => {
        let groupTouched = false;
        if (project.rooms[section]) {
          for (const roomName in project.rooms[section]) {
            const items = project.rooms[section][roomName].items;
            const groupItemsIds = pricingData[section][group].map(i => i.id);
            for (const id of groupItemsIds) {
              if (items[id] && items[id].quantity > 0) {
                groupTouched = true;
                break;
              }
            }
            if (groupTouched) break;
          }
        }
        if (groupTouched) touchedGroupsCount++;
      });
    }

    let progressPct = 0;
    if (totalGroupsCount > 0) {
      progressPct = Math.round((touchedGroupsCount / totalGroupsCount) * 100);
    }
    progressBar.style.width = `${progressPct}%`;
  }

  // --- PHOTOS VIEWER ---
  function openPhotosViewer(section, room, id) {
    const project = store.getCurrentProject();
    if (!project) return;
    let photoIds = [];
    
    if (section && room && id) {
      currentPhotoTarget = { section, room, id };
      if (!project.rooms[section][room].items[id]) {
        project.rooms[section][room].items[id] = { quantity: 0, comment: '', photos: [] };
      }
      photoIds = project.rooms[section][room].items[id].photos || [];
    } else {
      currentPhotoTarget = null;
      photoIds = project.photos || [];
    }

    photosGrid.innerHTML = '';
    
    // Add New Photo Button at the start
    const addBtn = document.createElement('button');
    addBtn.className = 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-primary-500 rounded-xl aspect-square flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-600 transition-colors cursor-pointer';
    addBtn.innerHTML = `<i class="fas fa-plus text-2xl mb-1"></i><span class="text-[10px] uppercase font-bold tracking-wider">Add Photo</span>`;
    addBtn.onclick = () => photoInput.click();
    photosGrid.appendChild(addBtn);

    photoIds.forEach((pid) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative aspect-square rounded-xl overflow-hidden bg-slate-200 dark:bg-slate-700 shadow-inner group';
      
      const img = document.createElement('img');
      img.className = 'w-full h-full object-cover transition-transform transform group-hover:scale-105 duration-300';
      localforage.getItem(pid).then(data => {
        if (data) img.src = data;
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'absolute top-1 right-1 bg-white/90 dark:bg-slate-900/90 text-red-500 w-7 h-7 rounded-full flex items-center justify-center shadow opacity-0 group-hover:opacity-100 transition-opacity transform hover:scale-110 focus:outline-none';
      delBtn.innerHTML = '<i class="fas fa-trash text-xs"></i>';
      delBtn.onclick = async () => {
        showConfirmModal("Delete Photo", "Are you sure you want to permanently delete this photo?", async () => {
          await localforage.removeItem(pid);
          if (currentPhotoTarget) {
             project.rooms[section][room].items[id].photos = project.rooms[section][room].items[id].photos.filter(p => p !== pid);
          } else {
             project.photos = project.photos.filter(p => p !== pid);
          }
          store.saveState();
          openPhotosViewer(currentPhotoTarget ? currentPhotoTarget.section : null, 
                           currentPhotoTarget ? currentPhotoTarget.room : null, 
                           currentPhotoTarget ? currentPhotoTarget.id : null);
          renderContent(); 
        });
      };

      wrapper.appendChild(img);
      wrapper.appendChild(delBtn);
      photosGrid.appendChild(wrapper);
    });

    photosModal.classList.remove('hidden');
  }

  btnCamera.addEventListener('click', () => { 
    openPhotosViewer(null, null, null);
  });

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      const photoId = 'photo_' + Date.now();
      
      await localforage.setItem(photoId, base64);
      
      if (currentPhotoTarget) {
        store.addItemPhoto(currentPhotoTarget.section, currentPhotoTarget.room, currentPhotoTarget.id, photoId);
      } else {
        const project = store.getCurrentProject();
        if (!project.photos) project.photos = [];
        project.photos.push(photoId);
        store.saveState();
      }
      
      // Auto-refresh viewer
      openPhotosViewer(currentPhotoTarget ? currentPhotoTarget.section : null, 
                       currentPhotoTarget ? currentPhotoTarget.room : null, 
                       currentPhotoTarget ? currentPhotoTarget.id : null);
      renderContent();
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // Reset input so same file can be chosen again
  });

  closePhotos.addEventListener('click', () => { photosModal.classList.add('hidden'); });

  // --- EXPORT SUITE ---

  function buildCSVContent(project) {
    let csvContent = `Project Name,${(project.name || "").replace(/,/g, "")}\n`;
    csvContent += `Location,${(project.location || "").replace(/,/g, "")}\n\n`;
    csvContent += "Section,Room,Item ID,Name,Cost,Quantity,Unit,Line Total,Comments\n";
    let grandTotal = 0;
    
    // Formatted cleanly with markdown styling for readability
    let notesText = `SPARK HOMES - PROJECT NOTES & COMMENTS\\n`;
    notesText += `Project: ${project.name}\\n`;
    if (project.location) notesText += `Location: ${project.location}\\n`;
    notesText += "=======================================\\n\\n";
    let hasNotes = false;
    
    for (const section in project.rooms) {
      for (const roomName in project.rooms[section]) {
        const items = project.rooms[section][roomName].items;
        for (const itemId in items) {
          const qty = items[itemId].quantity;
          if (qty > 0) {
            const cost = store.getItemCost(section, itemId);
            const lineTotal = qty * cost;
            grandTotal += lineTotal;
            
            let itemName = "Unknown";
            let unit = "unit";
            if (pricingData[section]) {
              for (const group in pricingData[section]) {
                const item = pricingData[section][group].find(i => i.id === itemId);
                if (item) {
                  itemName = item.name.replace(/,/g, ''); 
                  unit = item.unit;
                }
              }
            }
            
            const comment = items[itemId].comment ? items[itemId].comment.replace(/,/g, ';').replace(/\\n/g, ' ') : '';
            if (comment) {
              notesText += `[${section}] ${roomName === 'General' ? '' : roomName}\\n`;
              notesText += `  • Item: ${itemName}\\n`;
              notesText += `  • Note: ${items[itemId].comment}\\n\\n`;
              hasNotes = true;
            }

            csvContent += `${section},${roomName},${itemId},${itemName},${cost},${qty},${unit},${lineTotal},${comment}\n`;
          }
        }
      }
    }
    
    csvContent += `\n,,,,,,,GRAND TOTAL,,${grandTotal}`;
    if (!hasNotes) notesText += "No line item comments were added to this project.\\n";
    return { csvContent, grandTotal, notesText };
  }

  function buildSummaryCSV(project, grandTotal) {
    let content = "Section,Estimated Total\n";
    sections.forEach(sec => {
      if(sec === 'Summary') return;
      let secTotal = 0;
      if (project.rooms[sec]) {
        for (const room in project.rooms[sec]) {
          const items = project.rooms[sec][room].items;
          for (const id in items) {
            secTotal += items[id].quantity * store.getItemCost(sec, id);
          }
        }
      }
      if (secTotal > 0) {
        content += `${sec},${secTotal}\n`;
      }
    });
    content += `GRAND TOTAL,${grandTotal}\n`;
    return content;
  }

  function exportCSVOnly() {
    const project = store.getCurrentProject();
    if (!project) return;
    
    const { csvContent } = buildCSVContent(project);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Spark_Detailed_Estimate_${project.name.replace(/ /g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function buildPDFElement(project) {
    const printDoc = document.createElement('div');
    printDoc.className = 'print-doc bg-white text-black font-sans';
    printDoc.style.width = '700px';
    printDoc.style.padding = '20px';
    printDoc.style.color = '#000';
    printDoc.style.background = '#fff';
    printDoc.style.boxSizing = 'border-box';
    
    // Build header
    const header = document.createElement('div');
    header.style.borderBottom = '4px solid #f97316';
    header.style.paddingBottom = '20px';
    header.style.marginBottom = '30px';
    header.style.textAlign = 'center';
    header.innerHTML = `
      <h1 style="font-size: 28px; font-weight: 900; margin: 0; color: #111; text-transform: uppercase;">SPARK HOMES ESTIMATE</h1>
      <p style="font-size: 14px; color: #555; margin: 5px 0 0 0; font-weight: bold;">PROJECT: ${project.name.toUpperCase()}</p>
      ${project.location ? `<p style="font-size: 12px; color: #555; margin: 5px 0 0 0;">LOCATION: ${project.location}</p>` : ''}
      <p style="font-size: 12px; color: #888; margin: 5px 0 0 0;">Generated on ${new Date().toLocaleDateString()}</p>
    `;
    printDoc.appendChild(header);

    // Build Table
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    
    table.innerHTML = `
      <thead>
        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #ccc;">
          <th style="padding: 10px; text-align: left; font-weight: bold; width: 15%;">SECTION</th>
          <th style="padding: 10px; text-align: left; font-weight: bold; width: 45%;">ITEM DESCRIPTION</th>
          <th style="padding: 10px; text-align: right; font-weight: bold; width: 10%;">QTY</th>
          <th style="padding: 10px; text-align: right; font-weight: bold; width: 15%;">UNIT COST</th>
          <th style="padding: 10px; text-align: right; font-weight: bold; width: 15%;">LINE TOTAL</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    let grandTotal = 0;

    sections.forEach(sec => {
      if(sec === 'Summary') return;
      let secTotal = 0;
      let hasItems = false;
      let sectionRows = '';

      if (project.rooms[sec]) {
        for (const roomName in project.rooms[sec]) {
          const items = project.rooms[sec][roomName].items;
          for (const id in items) {
            const qty = items[id].quantity;
            if (qty > 0) {
              const cost = store.getItemCost(sec, id);
              const total = qty * cost;
              secTotal += total;
              hasItems = true;

              let itemName = "Unknown";
              if (pricingData[sec]) {
                for (const group in pricingData[sec]) {
                  const itemInfo = pricingData[sec][group].find(i => i.id === id);
                  if (itemInfo) itemName = itemInfo.name;
                }
              }

              const displayRoom = roomName === 'General' ? '' : `<span style="color: #666; font-weight: bold;">[${roomName}]</span> `;
              sectionRows += `
                <tr style="border-bottom: 1px solid #eee; page-break-inside: avoid;">
                  <td style="padding: 8px 10px; color: #888;"></td>
                  <td style="padding: 8px 10px;">${displayRoom}${itemName}</td>
                  <td style="padding: 8px 10px; text-align: right; font-family: monospace;">${qty}</td>
                  <td style="padding: 8px 10px; text-align: right; font-family: monospace;">$${cost.toFixed(2)}</td>
                  <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: #111;">$${total.toFixed(2)}</td>
                </tr>
              `;
            }
          }
        }
      }
      
      grandTotal += secTotal;
      
      if (hasItems) {
        const secHeaderRow = document.createElement('tr');
        secHeaderRow.style.pageBreakInside = 'avoid';
        secHeaderRow.innerHTML = `
          <td colspan="4" style="padding: 12px 10px; font-weight: 900; background: #f8fafc; border-top: 2px solid #ddd; text-transform: uppercase;">${sec}</td>
          <td style="padding: 12px 10px; font-weight: 900; background: #f8fafc; border-top: 2px solid #ddd; text-align: right; color: #ea580c;">$${secTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</td>
        `;
        tbody.appendChild(secHeaderRow);
        tbody.insertAdjacentHTML('beforeend', sectionRows);
      }
    });

    printDoc.appendChild(table);

    // Grand Total Footer
    const footer = document.createElement('div');
    footer.style.marginTop = '30px';
    footer.style.padding = '15px 20px';
    footer.style.backgroundColor = '#fff7ed';
    footer.style.borderTop = '4px solid #f97316';
    footer.style.display = 'flex';
    footer.style.justifyContent = 'space-between';
    footer.style.alignItems = 'center';
    footer.innerHTML = `
      <span style="font-weight: 900; font-size: 18px; color: #7c2d12;">GRAND TOTAL ESTIMATE</span>
      <span style="font-weight: 900; font-size: 24px; color: #ea580c;">$${grandTotal.toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})}</span>
    `;
    printDoc.appendChild(footer);
    
    return printDoc;
  }

  function exportPDF(projectName) {
    const btnText = document.getElementById('export-pdf-text');
    if (btnText) btnText.innerText = 'Generating PDF...';

    const project = store.getCurrentProject();
    if (!project) return;
    
    const printDoc = buildPDFElement(project);

    var opt = {
      margin:       0.5,
      filename:     `Spark_Summary_${projectName.replace(/ /g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(printDoc).save().then(() => {
      if (btnText) btnText.innerText = 'Download Summary (PDF)';
    });
  }

  async function exportProject() {
    const project = store.getCurrentProject();
    if (!project) return;
    
    const exportBtnText = document.getElementById('export-zip-text');
    if (exportBtnText) exportBtnText.innerText = 'Packaging Archive...';
    
    const zip = new JSZip();
    const { csvContent, grandTotal, notesText } = buildCSVContent(project);
    const summaryCsv = buildSummaryCSV(project, grandTotal);

    // 1. Add Text/CSV Files
    zip.file(`Estimate_Detailed_Breakdown.csv`, csvContent);
    zip.file(`Estimate_Summary.csv`, summaryCsv);
    // 2. Generate and Add PDF File
    const printDoc = buildPDFElement(project);
    
    var opt = {
      margin:       0.5,
      filename:     `Spark_Summary_${project.name.replace(/ /g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, allowTaint: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    try {
      const pdfBlob = await html2pdf().set(opt).from(printDoc).output('blob');
      zip.file(`Estimate_Summary.pdf`, pdfBlob);
    } catch (e) {
      console.warn("Failed to generate PDF for ZIP", e);
    }

    // 3. Add Line Item Photos
    for (const section in project.rooms) {
      for (const roomName in project.rooms[section]) {
        const items = project.rooms[section][roomName].items;
        for (const itemId in items) {
          if (items[itemId].photos && items[itemId].photos.length > 0) {
            let itemName = "Unknown";
            if (pricingData[section]) {
              for (const group in pricingData[section]) {
                const item = pricingData[section][group].find(i => i.id === itemId);
                if (item) itemName = item.name.replace(/,/g, ''); 
              }
            }

            const itemFolder = zip.folder(`Photos/${section}/${roomName}/${itemName}`);
            for (let i = 0; i < items[itemId].photos.length; i++) {
              const photoId = items[itemId].photos[i];
              const base64 = await localforage.getItem(photoId);
              if (base64) {
                const data = base64.split(',')[1];
                itemFolder.file(`Photo_${i+1}.jpg`, data, {base64: true});
              }
            }
          }
        }
      }
    }
    
    // 4. Add Global Project Photos
    if (project.photos && project.photos.length > 0) {
      const globalFolder = zip.folder("Photos/Global");
      for (let i = 0; i < project.photos.length; i++) {
        const photoId = project.photos[i];
        const base64 = await localforage.getItem(photoId);
        if (base64) {
          const data = base64.split(',')[1];
          globalFolder.file(`Global_Photo_${i+1}.jpg`, data, {base64: true});
        }
      }
    }
    
    // Generate ZIP
    zip.generateAsync({type:"blob"}).then(function(content) {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = `Spark_Project_Archive_${project.name.replace(/ /g, '_')}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      if (exportBtnText) exportBtnText.innerText = 'Download Full Archive (ZIP)';
    });
  }

  // Init Boot
  boot();
});

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
      document.querySelectorAll('.dropdown-menu').forEach(m => m.classList.add('hidden'));
    }
  });
