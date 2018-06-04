import { ANALYTICS_TOPICS } from '../constants.js';
import { IocRequesterMixin } from '../mixins/ioc-requester.js';
import { BindingHelpersMixin } from '../mixins/binding-helpers.js';
import '../styling/global--style-module.js';
import 'fontawesome-icon';
import { PolymerElement, html } from '@polymer/polymer';

class ResizerControl extends BindingHelpersMixin(IocRequesterMixin(PolymerElement)) {
  static get template() {
    return html`
      <style type="text/css" include="global--style-module">
        /*
        * The nested flex boxes are unfortunately neccessary to avoid Safaris 100% height bug
        */
        :host {
          display: flex;
          z-index: 5;
          visibility: hidden;
        }
        #container__resizer_control {
          display: flex;
        }
        #resizer {
          position: relative;
          border: 2px solid #5A6065;
          border: 2px solid var(--secondary-background-color);
          cursor: ew-resize;
          height: inherit;
        }

        #iconLeft, #iconRight {
          position: absolute;
          top: calc(50% - 15px);
          font-size: 3em;
          color: var(--secondary-background-color);
        }
        #iconLeft {
            margin-left: -1em;
        }
        #iconRight {
            margin-left: 0.5em;
        }
      </style>

      <div id="container__resizer_control">
        <div id="resizer" draggable="true" on-dragstart="_handleDragStart" on-drag="_resizeVideos" on-dragend="_handleDragEnd">
          <fontawesome-icon id="iconLeft" prefix="fas" name="angle-left" on-click="_handleLeftClick"></fontawesome-icon>
          <fontawesome-icon id="iconRight" prefix="fas" name="angle-right" on-click="_handleRightClick"></fontawesome-icon>
        </div>
      </div>
    `;
  }

  static get is() { return 'resizer-control'; }

  static get properties() {
    return {
      state: Object,
      videoAlignment: String,
      _videos: Array,
      _videoResolutions: Object,
      _mousePositionX: Number,
      _globalFlexBasisGap: {
        type: Array,
        value: () => [0, 0],
      },
      _analyticsManager: {
        type: Object,
        inject: 'AnalyticsManager',
      },
    };
  }

  static get observers() {
    return [
      '_fullscreenChanged(state.fullscreen)',
    ];
  }

  connectedCallback() {
    super.connectedCallback();

    // Get _videos to resize
    this._videos = [this._findPreviousVideo(), this._findNextVideo()];

    // Align videos according to their resolution
    this._videoResolutions = {};
    for(let i = 0; i < this._videos.length; i++) {
      this._videos[i].addEventListener('loaded-video', e => {
        this._videoResolutions[i] = e.detail.resolution;
        if(Object.keys(this._videoResolutions).length === Object.keys(this._videos).length) {
          this._alignVideoHeights();
        }
      });
    }
  }

  _handleDragStart(e) {
    // Neccessary for FF to handle Drag'n'Drop
    // Since FF does not support the mouse position within a drag event, it has to be handled with the dragover event
    e.dataTransfer.setData('text', '');
    this.parentElement.addEventListener('dragover', this._handleDragOver.bind(this));

    // Avoid a dragging ghost image by creating a new element which shall be
    // shown but is hidden per default. Unfortunately this is the only way to
    // do so.
    let dragImage = document.createElement('p');
    let text = document.createTextNode('DragImage');
    dragImage.appendChild(text);
    dragImage.style.visibility = 'hidden';
    document.body.appendChild(dragImage);

    // Microsoft Edge does not play well with our solution to hide the ghost
    // image but somehow needs the code above or it will crash.
    // Also, Edge does not support setDragImage which we use for our
    // ghost image solution for fullscreen mode. We use that feature to detect
    // support and then give Edge its special support.
    if(!window.StyleMedia) {
      // If we want to hide the ghost image in fullscreen mode, we have to
      // move it completely out of view by setting its position as -10000|-10000
      e.dataTransfer.setDragImage(dragImage, -10000, -10000);
    } else {
      // Workaround for Microsoft Edge to hide the ghost image. Unfortunately also
      // hides the resizer itself
      this.style.opacity = '0';
    }
  }

  _handleDragEnd() {
    // Remove the created ghost element & eventhandler when the dragging ended.
    document.body.removeChild(document.body.lastChild);
    this.parentElement.removeEventListener('dragover', this._handleDragOver.bind(this));

    this.style.opacity = '1';
    this._analyticsManager.newEvent({verb: ANALYTICS_TOPICS.VIDEO_CHANGE_SIZE}, this._getAnalyticsData());
  }

  _handleDragOver(e) {
    this._mousePositionX = e.pageX - this.parentElement.getBoundingClientRect().left;
  }

  _handleLeftClick() {
    let maxGap = (this.parentElement.offsetWidth * 0.49) / 2;
    let factor = 30;
    this._resizeToLeft(maxGap, factor);
  }

  _handleRightClick() {
    let maxGap = (this.parentElement.offsetWidth * 0.49) / 2;
    let factor = 30;
    this._resizeToRight(maxGap, factor);
  }

  _resizeVideos(e) {
    let resizerPositionX = (e.originalTarget || e.srcElement).offsetLeft;
    let direction = this._getMouseDirection(e, resizerPositionX);
    // MaxGap defines the maximal value by which a _videos can be increased or decreased.
    // Since we change both _videos at the same time the number has to be halved.
    let maxGap = (this.parentElement.offsetWidth * 0.49) / 2;
    let factor = Math.abs(this._mousePositionX - resizerPositionX);

    /*
    * The resizing consists of two parts: One video is increased, while the other one os decreased by the same factor.
    * This is neccessary to keep these two _videos in a row. If only one video is decreased it may be elem _videos from the belower row
    * will shift up.
    */
    if(direction === 'left') {
      this._resizeToLeft(maxGap, factor);
    } else if(direction === 'right') {
      this._resizeToRight(maxGap, factor);
    }
  }

  _findNextVideo() {
    // Iterate forward through the DOM until the first video element is found
    let elem = this; // eslint-disable-line consistent-this
    while (elem.nodeName !== 'VIDEO-STREAM') {
      elem = elem.nextElementSibling;
    }
    return elem;
  }

  _findPreviousVideo() {
    // Iterate backward through the DOM until the first video element is found
    let elem = this; // eslint-disable-line consistent-this
    while (elem.nodeName !== 'VIDEO-STREAM') {
      elem = elem.previousElementSibling;
    }
    return elem;
  }

  _getMouseDirection(e, resizerPositionX) {
    // This handles the special case when ending the drag,
    // where e.pageX is 0
    if(this._mousePositionX === 0) {
      return '';
    }

    if (this._mousePositionX < resizerPositionX) {
      return 'left';
    } else if (this._mousePositionX > resizerPositionX) {
      return 'right';
    }
  }

  _changeFlexBasis(video, factor, index, maxGap) {
    let oldValue = this._globalFlexBasisGap[index];

    // The new value is not allowed to be greater than the maximal gap
    let newValue = oldValue + factor;
    newValue = newValue <= - maxGap ? (- maxGap) : newValue;
    newValue = newValue >= maxGap ? maxGap : newValue;

    this._globalFlexBasisGap[index] = newValue;
    video.style.flexBasis = 'calc(49% + ' + newValue + 'px)';
  }

  _resizeToLeft(maxGap, factor) {
    if(factor !== 0.5 && this._globalFlexBasisGap[1] < maxGap) {
      this._changeFlexBasis(this._videos[1], factor, 1, maxGap);
      this._changeFlexBasis(this._videos[0], -factor, 0, maxGap);
    }
  }

  _resizeToRight(maxGap, factor) {
    if(factor !== 0.5 && this._globalFlexBasisGap[0] < maxGap) {
      this._changeFlexBasis(this._videos[1], -factor, 1, maxGap);
      this._changeFlexBasis(this._videos[0], factor, 0, maxGap);
    }
  }

  _alignVideoHeights() {
    // The width of the videos (100% - 2% (for the resizer))
    let containerWidth = 98;

    // Calculation based on two formulas
    // I video1Width + video2Width = containerWidth
    // II video1Width * ratio1 = video2Width * ratio2
    let ratio1 = this._videoResolutions[0].height / this._videoResolutions[0].width;
    let ratio2 = this._videoResolutions[1].height / this._videoResolutions[1].width;
    let video1Width = (containerWidth * ratio2) / (ratio1 + ratio2);
    let video2Width = (containerWidth * ratio1) / (ratio1 + ratio2);

    this._videos[0].style.flexBasis = video1Width + '%';
    this._videos[1].style.flexBasis = video2Width + '%';
  }

  _resetResizer () {
    // Resizing only makes sense if there are at least two _videos
    if(this._videos && this._videos.length > 1){
      this._videos[0].style.flexBasis = '49%';
      this._videos[1].style.flexBasis = '49%';
    }
  }

  _fullscreenChanged (isFullscreen) {
    // When we exit full screen, we will have a lot less screen real estate
    // available which means that sometimes we need to adapt
    if (!isFullscreen) {
      this._resetResizer();
    }
  }

  _getAnalyticsData() {
    let sizeRatio = this._videos[0].offsetWidth / this._videos[1].offsetWidth;
    let resizerControls = Array.from(this.parentElement.querySelectorAll('resizer-control'));
    return {
      newCurrentRatio: sizeRatio,
      resizerIndex: resizerControls.indexOf(this),
      resizerCount: resizerControls.length,
    };
  }
}

window.customElements.define(ResizerControl.is, ResizerControl);
