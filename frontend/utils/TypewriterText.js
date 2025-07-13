// TypewriterText utility for Web_demo chatbot interface
class TypewriterText {
    constructor(element, text, options = {}) {
        this.element = element;
        this.text = text;
        this.speed = options.speed || 30;
        this.onComplete = options.onComplete || null;
        this.onCharacter = options.onCharacter || null;
        
        this.index = 0;
        this.displayedText = '';
        this.isTyping = false;
        this.timeoutId = null;
        
        this.init();
    }
    
    init() {
        this.element.innerHTML = '';
        this.start();
    }
    
    start() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        this.type();
    }
    
    type() {
        if (this.index < this.text.length) {
            const char = this.text[this.index];
            this.displayedText += char;
            
            // Update element with cursor
            this.element.innerHTML = this.displayedText.replace(/\n/g, '<br>') + '<span class="typewriter-cursor">|</span>';
            
            this.index++;
            
            // Call character callback if provided
            if (this.onCharacter) {
                this.onCharacter(char, this.index);
            }
            
            // Vary speed based on character
            let delay = this.speed;
            if (char === '.' || char === '!' || char === '?') {
                delay = this.speed * 3; // Longer pause for punctuation
            } else if (char === ',' || char === ';' || char === ':') {
                delay = this.speed * 2; // Medium pause for other punctuation
            }
            
            this.timeoutId = setTimeout(() => this.type(), delay);
        } else {
            this.complete();
        }
    }
    
    complete() {
        this.isTyping = false;
        
        // Remove cursor
        this.element.innerHTML = this.displayedText.replace(/\n/g, '<br>');
        
        // Call completion callback if provided
        if (this.onComplete) {
            this.onComplete();
        }
    }
    
    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.isTyping = false;
        
        // Show full text immediately
        this.element.innerHTML = this.text.replace(/\n/g, '<br>');
    }
    
    reset() {
        this.stop();
        this.index = 0;
        this.displayedText = '';
        this.element.innerHTML = '';
    }
    
    // Static method to create typewriter effect
    static create(element, text, options = {}) {
        return new TypewriterText(element, text, options);
    }
    
    // Static method for simple one-time typing
    static type(element, text, options = {}) {
        return new TypewriterText(element, text, options);
    }
}

// Loading dots animation (matches Web_demo exactly)
class LoadingDots {
    constructor(element) {
        this.element = element;
        this.element.innerHTML = `
            <div class="flex space-x-1">
                <div class="w-2 h-2 bg-blue-500 rounded-full loading-dot" style="animation-delay: 0ms"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full loading-dot" style="animation-delay: 150ms"></div>
                <div class="w-2 h-2 bg-blue-500 rounded-full loading-dot" style="animation-delay: 300ms"></div>
            </div>
        `;
    }
    
    static create(element) {
        return new LoadingDots(element);
    }
}

// Thinking avatar animation (matches Web_demo exactly)
class ThinkingAvatar {
    constructor(element) {
        this.element = element;
        this.element.innerHTML = `
            <div class="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0 thinking-avatar">
                AI
            </div>
        `;
    }
    
    static create(element) {
        return new ThinkingAvatar(element);
    }
}

// Export for use in other files
window.TypewriterText = TypewriterText;
window.LoadingDots = LoadingDots;
window.ThinkingAvatar = ThinkingAvatar; 