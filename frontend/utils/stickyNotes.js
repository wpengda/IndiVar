// Sticky Notes Utility for Article Pages
export class StickyNotesManager {
  constructor(onNoteDeleted = null) {
    this.notes = [];
    this.nextId = 1;
    this.colors = ['yellow', 'pink', 'blue', 'green', 'purple'];
    this.onNoteDeleted = onNoteDeleted; // Callback for when a note is deleted
    this.dragState = {
      isDragging: false,
      currentNote: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0
    };
    
    // Create a container for all sticky notes positioned relative to the page
    this.container = this.createNotesContainer();
    
    this.initializeEventListeners();
  }

  createNotesContainer() {
    let container = document.getElementById('sticky-notes-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'sticky-notes-container';
      container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(container);
    }
    return container;
  }

  initializeEventListeners() {
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', () => this.handleMouseUp());
    document.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    document.addEventListener('touchend', () => this.handleTouchEnd());
  }

  createStickyNote(content, position = null, color = null) {
    const noteId = `note-${this.nextId++}`;
    const noteColor = color || 'yellow'; // Always use yellow as default
    
    // Create note element
    const noteElement = document.createElement('div');
    noteElement.className = `sticky-note ${noteColor} appear`;
    noteElement.id = noteId;
    noteElement.style.cssText = `
      position: absolute;
      pointer-events: auto;
      z-index: 1001;
    `;
    noteElement.innerHTML = `
      <div class="sticky-note-header">
        <div class="sticky-note-handle">Note</div>
        <button class="sticky-note-close" data-note-id="${noteId}">&times;</button>
      </div>
      <div class="sticky-note-content">${this.escapeHtml(content)}</div>
    `;

    // Position the note
    if (position) {
      noteElement.style.top = `${position.top}px`;
      noteElement.style.left = `${position.left}px`;
    } else {
      // Auto-position to avoid overlap
      const autoPosition = this.calculateAutoPosition();
      noteElement.style.top = `${autoPosition.top}px`;
      noteElement.style.left = `${autoPosition.left}px`;
    }

    // Add event listeners
    this.addNoteEventListeners(noteElement);
    
    // Add to container
    this.container.appendChild(noteElement);
    
    // Store note data
    const noteData = {
      id: noteId,
      content: content,
      color: noteColor,
      position: {
        top: parseInt(noteElement.style.top),
        left: parseInt(noteElement.style.left)
      }
    };
    
    this.notes.push(noteData);
    
    // Save position immediately after creation
    this.saveNotePosition(noteData);
    
    // Remove animation class after animation completes
    setTimeout(() => {
      noteElement.classList.remove('appear');
    }, 300);
    
    return noteData;
  }

  calculateAutoPosition() {
    const existingNotes = this.container.querySelectorAll('.sticky-note');
    
    // Start from a random position on the page
    let top = Math.random() * (window.innerHeight - 200) + 50; // 50px from top, 200px from bottom
    let left = Math.random() * (window.innerWidth - 200) + 50; // 50px from left, 200px from right
    
    // Check for overlaps and adjust position
    let attempts = 0;
    while (attempts < 10) {
      let hasOverlap = false;
      
      for (let note of existingNotes) {
        const noteTop = parseInt(note.style.top) || 0;
        const noteLeft = parseInt(note.style.left) || 0;
        
        // Check if positions are too close (within 150px)
        if (Math.abs(noteTop - top) < 150 && Math.abs(noteLeft - left) < 150) {
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap) break;
      
      // Try a new position
      top = Math.random() * (window.innerHeight - 200) + 50;
      left = Math.random() * (window.innerWidth - 200) + 50;
      attempts++;
    }
    
    return { top, left };
  }

  addNoteEventListeners(noteElement) {
    const handle = noteElement.querySelector('.sticky-note-handle');
    const closeButton = noteElement.querySelector('.sticky-note-close');
    
    // Mouse events for dragging
    handle.addEventListener('mousedown', (e) => this.handleMouseDown(e, noteElement));
    noteElement.addEventListener('mousedown', (e) => this.handleMouseDown(e, noteElement));
    
    // Touch events for mobile
    handle.addEventListener('touchstart', (e) => this.handleTouchStart(e, noteElement));
    noteElement.addEventListener('touchstart', (e) => this.handleTouchStart(e, noteElement));
    
    // Close button
    closeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.removeNote(noteElement.id);
    });
    
    // Prevent text selection during drag
    noteElement.addEventListener('dragstart', (e) => e.preventDefault());
  }

  handleMouseDown(e, noteElement) {
    if (e.target.classList.contains('sticky-note-close')) return;
    
    e.preventDefault();
    this.startDrag(noteElement, e.clientX, e.clientY);
  }

  handleTouchStart(e, noteElement) {
    if (e.target.classList.contains('sticky-note-close')) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.startDrag(noteElement, touch.clientX, touch.clientY);
  }

  startDrag(noteElement, clientX, clientY) {
    this.dragState.isDragging = true;
    this.dragState.currentNote = noteElement;
    
    const rect = noteElement.getBoundingClientRect();
    this.dragState.offsetX = clientX - rect.left;
    this.dragState.offsetY = clientY - rect.top;
    
    noteElement.classList.add('dragging');
    document.body.style.cursor = 'grabbing';
  }

  handleMouseMove(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    this.updateNotePosition(e.clientX, e.clientY);
  }

  handleTouchMove(e) {
    if (!this.dragState.isDragging) return;
    
    e.preventDefault();
    const touch = e.touches[0];
    this.updateNotePosition(touch.clientX, touch.clientY);
  }

  updateNotePosition(clientX, clientY) {
    const note = this.dragState.currentNote;
    if (!note) return;
    
    // Calculate new position relative to viewport
    let newLeft = clientX - this.dragState.offsetX;
    let newTop = clientY - this.dragState.offsetY;
    
    // Constrain to viewport bounds
    newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - note.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, window.innerHeight - note.offsetHeight));
    
    note.style.left = `${newLeft}px`;
    note.style.top = `${newTop}px`;
  }

  handleMouseUp() {
    this.endDrag();
  }

  handleTouchEnd() {
    this.endDrag();
  }

  endDrag() {
    if (!this.dragState.isDragging) return;
    
    const note = this.dragState.currentNote;
    if (note) {
      note.classList.remove('dragging');
      
      // Update stored position
      const noteData = this.notes.find(n => n.id === note.id);
      if (noteData) {
        noteData.position = {
          top: parseInt(note.style.top),
          left: parseInt(note.style.left)
        };
      }
      
      // Save position to database
      this.saveNotePosition(noteData);
    }
    
    this.dragState.isDragging = false;
    this.dragState.currentNote = null;
    document.body.style.cursor = '';
  }

  async saveNotePosition(noteData) {
    try {
      // Save the note position to localStorage as a simple solution
      // In a more complex setup, you could save to the database
      const positions = JSON.parse(localStorage.getItem('stickyNotePositions') || '{}');
      const articleId = new URLSearchParams(window.location.search).get('id');
      
      if (!articleId) {
        console.error('No article ID found in URL for saving position');
        return;
      }
      
      if (!positions[articleId]) {
        positions[articleId] = {};
      }
      
      // Use a content-based key for better matching
      const contentKey = this.generateContentKey(noteData.content);
      positions[articleId][contentKey] = {
        top: noteData.position.top,
        left: noteData.position.left,
        content: noteData.content,
        timestamp: Date.now()
      };
      
      localStorage.setItem('stickyNotePositions', JSON.stringify(positions));
    } catch (error) {
      console.error('Error saving note position:', error);
    }
  }

  loadSavedPositions() {
    try {
      const positions = JSON.parse(localStorage.getItem('stickyNotePositions') || '{}');
      const articleId = new URLSearchParams(window.location.search).get('id');
      
      if (!articleId) {
        console.error('No article ID found in URL for loading positions');
        return {};
      }
      
      if (positions[articleId]) {
        return positions[articleId];
      }
      return {};
    } catch (error) {
      console.error('Error loading saved positions:', error);
      return {};
    }
  }

  removeNote(noteId) {
    // Find the note data first so we can remove it from localStorage
    const noteData = this.notes.find(note => note.id === noteId);
    
    const noteElement = document.getElementById(noteId);
    if (noteElement) {
      // Simple fade out animation
      noteElement.style.transition = 'opacity 0.3s ease-out';
      noteElement.style.opacity = '0';
      setTimeout(() => {
        noteElement.remove();
      }, 300);
    }
    
    // Remove from notes array
    this.notes = this.notes.filter(note => note.id !== noteId);
    
    // Remove from localStorage if note data exists
    if (noteData) {
      this.removeSavedPosition(noteData.content);
      
      // Call the callback to update backend if provided
      if (this.onNoteDeleted && typeof this.onNoteDeleted === 'function') {
        this.onNoteDeleted(noteData.content);
      }
    }
  }

  removeAllNotes() {
    this.notes.forEach(note => {
      const noteElement = document.getElementById(note.id);
      if (noteElement) {
        noteElement.remove();
      }
    });
    this.notes = [];
  }

  removeSavedPosition(content) {
    try {
      const positions = JSON.parse(localStorage.getItem('stickyNotePositions') || '{}');
      const articleId = new URLSearchParams(window.location.search).get('id');
      
      if (!articleId) {
        console.error('No article ID found in URL for removing position');
        return;
      }
      
      if (positions[articleId]) {
        const contentKey = this.generateContentKey(content);
        delete positions[articleId][contentKey];
        localStorage.setItem('stickyNotePositions', JSON.stringify(positions));
      }
    } catch (error) {
      console.error('Error removing saved position:', error);
    }
  }

  clearSavedPositions() {
    try {
      const positions = JSON.parse(localStorage.getItem('stickyNotePositions') || '{}');
      const articleId = new URLSearchParams(window.location.search).get('id');
      
      if (positions[articleId]) {
        delete positions[articleId];
        localStorage.setItem('stickyNotePositions', JSON.stringify(positions));
      }
    } catch (error) {
      console.error('Error clearing saved positions:', error);
    }
  }

  // Create multiple notes from text (split by sentences or paragraphs)
  createNotesFromText(text, maxNotesPerSide = 3) {
    if (!text || text.trim() === '') return [];
    
    // Load saved positions
    const savedPositions = this.loadSavedPositions();
    
    // First, check if text contains our note separators (\n\n)
    const noteChunks = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    
    let chunks;
    if (noteChunks.length > 1) {
      // Use the note chunks separated by \n\n
      chunks = noteChunks;
    } else {
      // Fall back to sentence splitting if no \n\n separators
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      chunks = sentences;
    }
    
    // Limit the number of notes
    const maxNotes = Math.min(chunks.length, 12); // Allow more notes since we have the whole page
    const selectedChunks = chunks.slice(0, maxNotes);
    
    const createdNotes = [];
    selectedChunks.forEach((chunk, index) => {
      const cleanChunk = chunk.trim();
      let savedPosition = null;
      
      // Try to find a saved position using content key matching
      const contentKey = this.generateContentKey(cleanChunk);
      if (savedPositions[contentKey]) {
        savedPosition = { 
          top: savedPositions[contentKey].top, 
          left: savedPositions[contentKey].left 
        };
      }
      
      const note = this.createStickyNote(cleanChunk, savedPosition);
      createdNotes.push(note);
    });
    
    return createdNotes;
  }

  // Get all notes data for saving
  getNotesData() {
    return this.notes.map(note => ({
      id: note.id,
      content: note.content,
      color: note.color,
      position: note.position
    }));
  }

  // Load notes from data
  loadNotes(notesData) {
    this.removeAllNotes();
    
    notesData.forEach(noteData => {
      this.createStickyNote(
        noteData.content,
        {
          top: noteData.position.top,
          left: noteData.position.left
        },
        'yellow' // Always use yellow color
      );
    });
  }

  // Generate a consistent content key for position matching
  generateContentKey(content) {
    // Normalize the content by removing extra whitespace and converting to lowercase
    const normalized = content.replace(/\s+/g, ' ').trim().toLowerCase();
    // Take first 100 characters to create a unique but consistent key
    return normalized.substring(0, 100);
  }

  // Utility function to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
} 