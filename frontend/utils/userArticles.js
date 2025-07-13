// User Article Interactions API utility
import { getAuthToken } from './auth.js';
import { StickyNotesManager } from './stickyNotes.js';

const API_BASE = '/api/user-articles';

// Get user's article data (read status and note)
export const getUserArticleData = async (articleId) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/${articleId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get user article data');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting user article data:', error);
    throw error;
  }
};

// Toggle read status for an article
export const toggleReadStatus = async (articleId, isRead) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/${articleId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ isRead })
    });

    if (!response.ok) {
      throw new Error('Failed to update read status');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error toggling read status:', error);
    throw error;
  }
};

// Save or update note for an article (appends to existing)
export const saveNote = async (articleId, note) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/${articleId}/note`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note })
    });

    if (!response.ok) {
      throw new Error('Failed to save note');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};

// Replace entire note content for an article (for deletions/updates)
export const replaceNote = async (articleId, note) => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/${articleId}/note`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ note })
    });

    if (!response.ok) {
      throw new Error('Failed to replace note');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error replacing note:', error);
    throw error;
  }
};

// Get all user's read articles
export const getUserReadArticles = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/read/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get read articles');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting read articles:', error);
    throw error;
  }
};

// Get articles with user interaction data
export const getArticlesWithUserData = async () => {
  try {
    const token = getAuthToken();
    if (!token) {
      throw new Error('User not authenticated');
    }

    const response = await fetch(`${API_BASE}/with-user-data/all`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get articles with user data');
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error getting articles with user data:', error);
    throw error;
  }
};

// Show status message
export const showNotesStatus = (message, isError = false) => {
  const statusElement = document.getElementById('notes-status');
  if (statusElement) {
    statusElement.textContent = message;
    statusElement.className = `notes-status ${isError ? 'error' : 'success'}`;
    
    // Hide the message after 3 seconds
    setTimeout(() => {
      statusElement.style.display = 'none';
    }, 3000);
  }
};

// Initialize user article interactions on article page
export const initializeUserArticleInteractions = async () => {
  console.log('initializeUserArticleInteractions called');
  
  // Check if user is logged in
  const token = getAuthToken();
  console.log('Auth token:', token ? 'present' : 'not found');
  
  if (!token) {
    console.log('User not logged in, skipping user interactions');
    return; // Don't show user interaction section if not logged in
  }

  // Show user interaction section
  const userInteractionSection = document.getElementById('user-interaction-section');
  console.log('User interaction section element:', userInteractionSection);
  
  if (userInteractionSection) {
    userInteractionSection.style.display = 'block';
    console.log('User interaction section displayed');
  } else {
    console.error('User interaction section element not found');
    return;
  }

  // Initialize sticky notes manager with deletion callback
  const handleNoteDeleted = async (deletedContent) => {
    try {
      // Get current note content from backend
      const currentUserData = await getUserArticleData(articleId);
      let currentNote = currentUserData.note || '';
      
      // Remove the deleted content from the backend note
      // Split by \n\n (note separators) and filter out the deleted content
      const noteChunks = currentNote.split(/\n\s*\n/).filter(chunk => chunk.trim().length > 0);
      const updatedChunks = noteChunks.filter(chunk => chunk.trim() !== deletedContent.trim());
      const updatedNote = updatedChunks.join('\n\n');
      
      // Replace the entire note content in backend (don't append!)
      await replaceNote(articleId, updatedNote);
      console.log('Note content removed from backend');
    } catch (error) {
      console.error('Error removing note content from backend:', error);
    }
  };
  
  const stickyNotesManager = new StickyNotesManager(handleNoteDeleted);
  console.log('Sticky notes manager initialized');

  // Get article ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const articleId = urlParams.get('id');
  console.log('Article ID from URL:', articleId);
  
  if (!articleId) {
    console.error('No article ID found in URL');
    return;
  }

  try {
    console.log('Loading user article data...');
    // Load user's article data
    const userData = await getUserArticleData(articleId);
    console.log('User article data loaded:', userData);
    
    // Set read status checkbox
    const readStatusCheckbox = document.getElementById('read-status-checkbox');
    if (readStatusCheckbox) {
      readStatusCheckbox.checked = userData.isRead;
      console.log('Read status checkbox set to:', userData.isRead);
      
      // Add event listener for read status toggle
      readStatusCheckbox.addEventListener('change', async (e) => {
        try {
          await toggleReadStatus(articleId, e.target.checked);
          showNotesStatus(e.target.checked ? 'Article marked as read' : 'Article marked as unread');
        } catch (error) {
          showNotesStatus('Failed to update read status', true);
          // Revert checkbox state
          e.target.checked = !e.target.checked;
        }
      });
    } else {
      console.error('Read status checkbox not found');
    }
    
    // Set note content
    const notesTextarea = document.getElementById('article-notes');
    if (notesTextarea) {
      notesTextarea.value = userData.note;
      console.log('Notes textarea set with existing note');
      
      // Create sticky notes from existing saved content
      if (userData.note && userData.note.trim().length > 0) {
        console.log('Creating sticky notes from existing saved content');
        const createdNotes = stickyNotesManager.createNotesFromText(userData.note.trim());
        console.log('Created sticky notes from saved content:', createdNotes);
        
        // Clear the textarea since the content is now displayed as sticky notes
        notesTextarea.value = '';
      }
    } else {
      console.error('Notes textarea not found');
    }
    
    // Add event listeners for note actions
    const saveNoteBtn = document.getElementById('save-note-btn');
    const clearNoteBtn = document.getElementById('clear-note-btn');
    
    if (saveNoteBtn) {
      // Check if event listener already added to prevent duplicates
      if (!saveNoteBtn.dataset.listenerAdded) {
        saveNoteBtn.addEventListener('click', async () => {
          try {
            const note = notesTextarea.value.trim();
            await saveNote(articleId, note);
            showNotesStatus('Note added successfully');
            
            // Clear existing sticky notes first
            stickyNotesManager.removeAllNotes();
            
            // Fetch the updated user data to get the full appended content
            const updatedUserData = await getUserArticleData(articleId);
            console.log('Updated user data after save:', updatedUserData);
            
            // Create sticky notes from the full appended content
            if (updatedUserData.note && updatedUserData.note.trim().length > 0) {
              console.log('Creating sticky notes from full appended content');
              const createdNotes = stickyNotesManager.createNotesFromText(updatedUserData.note.trim());
              console.log('Created sticky notes:', createdNotes);
            }
            
            // Clear the textarea after saving
            notesTextarea.value = '';
          } catch (error) {
            showNotesStatus('Failed to add note', true);
          }
        });
        saveNoteBtn.dataset.listenerAdded = 'true';
        console.log('Add note button event listener added');
              } else {
          console.log('Add note button event listener already exists, skipping');
        }
    } else {
      console.error('Save note button not found');
    }
    
    if (clearNoteBtn) {
      // Check if event listener already added to prevent duplicates
      if (!clearNoteBtn.dataset.listenerAdded) {
        clearNoteBtn.addEventListener('click', async () => {
          if (confirm('Are you sure you want to clear all your notes?')) {
            try {
              notesTextarea.value = '';
              await saveNote(articleId, '');
              showNotesStatus('All notes cleared');
              
              // Clear all sticky notes and saved positions
              stickyNotesManager.removeAllNotes();
              stickyNotesManager.clearSavedPositions();
              console.log('All sticky notes and saved positions cleared');
            } catch (error) {
              showNotesStatus('Failed to clear notes', true);
            }
          }
        });
        clearNoteBtn.dataset.listenerAdded = 'true';
        console.log('Clear note button event listener added');
      } else {
        console.log('Clear note button event listener already exists, skipping');
      }
    } else {
      console.error('Clear note button not found');
    }
    
    console.log('User article interactions fully initialized');
    
  } catch (error) {
    console.error('Error initializing user article interactions:', error);
  }
}; 