class Store {
  constructor() {
    this.storageKey = 'spark_estimator_data';
    this.state = this.loadState() || {
      projects: [],
      currentProjectId: null,
      customPricing: {}, // { "Interior": { "1": 50.00 } }
      appTheme: 'system' // 'light', 'dark', 'system'
    };
  }

  getInitialState() {
    return {
      projects: [],
      currentProjectId: null,
      customPricing: {},
      appTheme: 'system'
    };
  }

  loadState() {
    try {
      const serialized = localStorage.getItem(this.storageKey);
      if (serialized) {
        return JSON.parse(serialized);
      }
    } catch (e) {
      console.error('Failed to load state from localStorage', e);
    }
    return null;
  }

  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save state to localStorage', e);
    }
  }

  createProject(name, location = "") {
    const newProject = {
      id: Date.now().toString(),
      name: name,
      location: location,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      rooms: {
        "Interior": {},
        "Kitchen": {},
        "Bathrooms": {},
        "Systems & Structure": {},
        "Exterior": {}
      },
      photos: []
    };
    
    // Add default instances
    this.addRoomInstance(newProject, "Interior", "General");
    this.addRoomInstance(newProject, "Kitchen", "Kitchen 1");
    this.addRoomInstance(newProject, "Bathrooms", "Bathroom 1");
    this.addRoomInstance(newProject, "Systems & Structure", "General");
    this.addRoomInstance(newProject, "Exterior", "General");

    this.state.projects.push(newProject);
    this.state.currentProjectId = newProject.id;
    this.saveState();
    return newProject;
  }

  updateProjectLocation(id, location) {
    const project = this.state.projects.find(p => p.id === id);
    if (project) {
      project.location = location;
      project.updatedAt = new Date().toISOString();
      this.saveState();
      return true;
    }
    return false;
  }

  updateProjectDetails(id, name, location) {
    const project = this.state.projects.find(p => p.id === id);
    if (project) {
      if (name) project.name = name;
      project.location = location;
      project.updatedAt = new Date().toISOString();
      this.saveState();
      return true;
    }
    return false;
  }

  addRoomInstance(project, section, roomName) {
    if (!project.rooms[section]) {
      project.rooms[section] = {};
    }
    project.rooms[section][roomName] = {
      items: {} // key: itemId, value: { quantity, overrideCost }
    };
  }

  getCurrentProject() {
    if (!this.state.currentProjectId) return null;
    return this.state.projects.find(p => p.id === this.state.currentProjectId);
  }

  switchProject(id) {
    if (this.state.projects.find(p => p.id === id)) {
      this.state.currentProjectId = id;
      this.saveState();
      return true;
    }
    return false;
  }

  deleteProject(id) {
    this.state.projects = this.state.projects.filter(p => p.id !== id);
    if (this.state.currentProjectId === id) {
      this.state.currentProjectId = this.state.projects.length > 0 ? this.state.projects[0].id : null;
    }
    this.saveState();
  }

  updateItemQuantity(section, roomName, itemId, quantity) {
    const project = this.getCurrentProject();
    if (!project) return;
    
    if (!project.rooms[section][roomName]) {
      this.addRoomInstance(project, section, roomName);
    }
    
    if (!project.rooms[section][roomName].items[itemId]) {
      project.rooms[section][roomName].items[itemId] = { quantity: 0 };
    }
    
    project.rooms[section][roomName].items[itemId].quantity = quantity;
    project.updatedAt = new Date().toISOString();
    this.saveState();
  }

  getProjectTotal() {
    const project = this.getCurrentProject();
    if (!project) return 0;
    
    let total = 0;
    
    // Calculate total from data map
    for (const section in project.rooms) {
      for (const roomName in project.rooms[section]) {
        const items = project.rooms[section][roomName].items;
        for (const itemId in items) {
          const qty = items[itemId].quantity;
          if (qty > 0) {
            const cost = this.getItemCost(section, itemId);
            total += qty * cost;
          }
        }
      }
    }
    
    return total;
  }

  setItemComment(section, roomName, itemId, comment) {
    const project = this.getCurrentProject();
    if (!project) return;
    if (!project.rooms[section]) return;
    if (!project.rooms[section][roomName]) return;
    
    if (!project.rooms[section][roomName].items[itemId]) {
      project.rooms[section][roomName].items[itemId] = { quantity: 0, comment: '', photos: [] };
    }
    
    project.rooms[section][roomName].items[itemId].comment = comment;
    this.saveState();
  }

  addItemPhoto(section, roomName, itemId, photoId) {
    const project = this.getCurrentProject();
    if (!project) return;
    if (!project.rooms[section]) return;
    if (!project.rooms[section][roomName]) return;
    
    if (!project.rooms[section][roomName].items[itemId]) {
      project.rooms[section][roomName].items[itemId] = { quantity: 0, comment: '', photos: [] };
    }
    
    if (!project.rooms[section][roomName].items[itemId].photos) {
      project.rooms[section][roomName].items[itemId].photos = [];
    }
    
    project.rooms[section][roomName].items[itemId].photos.push(photoId);
    this.saveState();
  }

  getItemCost(section, itemId) {
    // Check for custom pricing first
    if (this.state.customPricing && this.state.customPricing[section] && this.state.customPricing[section][itemId] !== undefined) {
      return this.state.customPricing[section][itemId];
    }
    // Fallback to default
    if (pricingData[section]) {
      for (const group in pricingData[section]) {
        const item = pricingData[section][group].find(i => i.id === itemId);
        if (item) return item.cost;
      }
    }
    return 0;
  }

  setCustomPrice(section, itemId, cost) {
    if (!this.state.customPricing) this.state.customPricing = {};
    if (!this.state.customPricing[section]) this.state.customPricing[section] = {};
    this.state.customPricing[section][itemId] = parseFloat(cost) || 0;
    this.saveState();
  }

  setTheme(theme) {
    this.state.appTheme = theme;
    this.saveState();
  }
}

// Initialize global store
const store = new Store();
