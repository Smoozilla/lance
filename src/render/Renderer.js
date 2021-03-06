'use strict';

const EventEmitter = require('eventemitter3');

const TIME_RESET_THRESHOLD = 100;

/**
 * The Renderer is the component which must *draw* the game on the client.
 * It will be instantiated once on each client, and must implement the draw
 * method.  The draw method will be invoked on every iteration of the browser's
 * render loop.
 */
class Renderer {

    /**
    * Constructor of the Renderer singleton.
    * @param {GameEngine} gameEngine - Reference to the GameEngine instance.
    * @param {ClientEngine} clientEngine - Reference to the ClientEngine instance.
    */
    constructor(gameEngine, clientEngine) {
        this.gameEngine = gameEngine;
        this.clientEngine = clientEngine;
        this.gameEngine.on('client__stepReset', () => { this.doReset = true; });
        gameEngine.on('objectAdded', this.addObject.bind(this));
        gameEngine.on('objectDestroyed', this.removeObject.bind(this));

        // mixin for EventEmitter
        Object.assign(this, EventEmitter.prototype);
    }

    /**
     * Initialize the renderer.
     * @return {Promise} Resolves when renderer is ready.
    */
    init() {
        if ((typeof window === 'undefined') || !document) {
            console.log('renderer invoked on server side.');
        }
        return Promise.resolve(); // eslint-disable-line new-cap
    }

    reportSlowFrameRate() {
        this.gameEngine.emit('client__slowFrameRate');
    }

    /**
     * The main draw function.  This method is called at high frequency,
     * at the rate of the render loop.  Typically this is 60Hz, in WebVR 90Hz.
     * If the client engine has been configured to render-schedule, then this
     * method must call the clientEngine's step method.
     *
     * @param {Number} t - current time (only required in render-schedule mode)
     * @param {Number} dt - time elapsed since last draw (only required in render-schedule mode)
     */
    draw(t, dt) {
        if (this.clientEngine.options.scheduler === 'render-schedule')
            this.runClientStep(t, dt);
    }

    /**
     * The main draw function.  This method is called at high frequency,
     * at the rate of the render loop.  Typically this is 60Hz, in WebVR 90Hz.
     *
     * @param {Number} t - current time
     * @param {Number} dt - time elapsed since last draw
     */
    runClientStep(t, dt) {
        let p = this.clientEngine.options.stepPeriod;

        if (this.doReset || t > this.clientEngine.lastStepTime + TIME_RESET_THRESHOLD) {
            this.doReset = false;
            this.clientEngine.lastStepTime = t - p / 2;
            this.clientEngine.correction = p / 2;
// HACK: remove next line
            this.clientEngine.gameEngine.trace.trace(`============RESETTING lastTime=${this.clientEngine.lastStepTime} period=${p}`);
        }

        // catch-up missed steps
        while (t > this.clientEngine.lastStepTime + p) {
// HACK: remove next line
this.clientEngine.gameEngine.trace.trace(`============RENDERER DRAWING EXTRA t=${t} LST=${this.clientEngine.lastStepTime} correction = ${this.clientEngine.correction} period=${p}`);
            this.clientEngine.step(this.clientEngine.lastStepTime + p, p + this.clientEngine.correction);
            this.clientEngine.lastStepTime += p;
            this.clientEngine.correction = 0;
        }

        // not ready for a real step yet
        // might happen after catch up above
        if (t < this.clientEngine.lastStepTime) {
// HACK: remove next line
            this.clientEngine.gameEngine.trace.trace(`============RENDERER DRAWING NOSTEP t=${t} dt=${t - this.clientEngine.lastStepTime} correction = ${this.clientEngine.correction} period=${p}`);

            dt = t - this.clientEngine.lastStepTime + this.clientEngine.correction;
            if (dt < 0) dt = 0;
            this.clientEngine.correction = this.clientEngine.lastStepTime - t;
            this.clientEngine.step(t, dt, true);
            return;
        }

        // render-controlled step

// HACK: remove next line
        this.clientEngine.gameEngine.trace.trace(`============RENDERER DRAWING t=${t} LST=${this.clientEngine.lastStepTime} correction = ${this.clientEngine.correction} period=${p}`);

        dt = t - this.clientEngine.lastStepTime + this.clientEngine.correction;
        this.clientEngine.lastStepTime += p;
        this.clientEngine.correction = this.clientEngine.lastStepTime - t;
        this.clientEngine.step(t, dt);

// HACK: remove next line
this.clientEngine.gameEngine.trace.trace(`============RENDERER DONE t=${t} LST=${this.clientEngine.lastStepTime} correction = ${this.clientEngine.correction} period=${p}`);
    }

    /**
     * Handle the addition of a new object to the world.
     * @param {Object} obj - The object to be added.
     */
    addObject(obj) {
    }

    /**
     * Handle the removal of an old object from the world.
     * @param {Object} obj - The object to be removed.
     */
    removeObject(obj) {
    }
}

module.exports = Renderer;
