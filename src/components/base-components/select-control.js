import { BindingHelpersMixin } from '../../mixins/binding-helpers.js';
import '../../styling/control-bar--style-module.js';
import 'fontawesome-icon';
import { PolymerElement, html } from '@polymer/polymer';

class SelectControl extends BindingHelpersMixin(PolymerElement) {
  static get template() {
    return html`
      <style type="text/css" include="control-bar--style-module">
        :host {
          width: 100%;
        }

        #inner_container__select_control {
          position: relative;
          height: 40px;
        }
        .dropdown .dropdown-content {
          position: absolute;
          /* Equals control bar height. This is set to assure that the dropdown opens to the top. */
          bottom: 40px;
          /* Cancel out the padding */
          left: -10px;
          right: -10px;
          z-index: 10;

          border: 1px solid black;
          border-bottom: none;

          @apply --set-foreground-color;
          @apply --set-background-color;
        }
        .dropdown .dropdown-content a {
          display: inline-block;
          line-height: 2;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dropdown .dropdown-content a:hover,
        .dropdown .dropdown-content a.selected {
          background-color: grey;
        }

        .dropdown #button__select.with-badge:after {
          content: attr(badge-value);
          position: absolute;
          top: 6px;
          right: -12px;
          width: 20px;
          @apply --set-accent-color-background;
          @apply --set-font-color-on-accent-color;
          border-radius: 2px;
          line-height: 1.5;
          font-size: 9px;
          font-weight: lighter;
        }

        #container__select_control {
          padding-right: 10px;
        }

        #container__select_control.in-menu-entry {
          background-color: transparent;
        }

        .in-menu-entry #inner_container__select_control {
          display: flex;
          justify-content: space-between;
          width: 100%;
        }

        .in-menu-entry #button__select {
          /* Necessary for horizontally aligning all icons */
           width: 30px;
        }
        .in-menu-entry #dropdown__select {
          display: flex;
        }
        .in-menu-entry #button__select, .in-menu-entry #dropdown__select a {
          padding: 0 5px;
          color: white;
        }

        .in-menu-entry #dropdown__select a.selected {
          @apply --set-accent-color-background;
          @apply --set-font-color-on-accent-color;
        }
      </style>

      <div id="container__select_control" class$="user_controls [[ifNotThen(isInMobileMenu, 'dropdown')]] [[ifThen(isInMobileMenu, 'in-menu-entry')]]">
        <div id="inner_container__select_control" on-mouseover="_handleMouseOver" on-mouseout="_handleMouseOut">
          <a id="button__select" class$="button [[ifThen(selectedItem.value, 'with-badge')]] [[ifNotThen(active, 'inactive')]]" badge-value$="[[selectedItem.text]]" href="javascript:void(0)" on-click="_handleClick">
            <fontawesome-icon prefix="[[iconPrefix]]" name="[[iconName]]" fixed-width></fontawesome-icon>
          </a>
          <div id="dropdown__select" class$="dropdown-content [[ifNotThen(_isDropDownOpen, '-hidden')]]">
            <template is="dom-repeat" items="[[items]]">
              <a on-click="_handleDropDownElementClick" name="[[item.text]]" class$="[[ifEqualsThen(item.value, selectedValue, 'selected')]]" href="javascript:void(0)">
                [[item.text]]
              </a>
            </template>
          </div>
        </div>
      </div>
    `;
  }

  static get is() { return 'select-control'; }

  static get properties() {
    return {
      state: Object,
      items: {
        type: Array,
        value: () => [],
      },
      selectedValue: Object,
      selectedItem: {
        type: Object,
        computed: '_getSelectedItem(items, selectedValue)',
      },
      iconPrefix: String,
      iconName: String,
      isInMobileMenu: {
        type: Boolean,
        value: false,
      },
      _isDropDownOpen: {
        type: Boolean,
        value: false,
      },
      active: {
        type: Boolean,
        value: true,
      },
    };
  }

  static get observers() {
    return [
      '_mobileSettingsMenuChanged(state.mobileSettingsMenuOpen)',
    ];
  }

  _handleMouseOver() {
    if(!this.state.mobileSettingsMenuOpen) {
      this._showDropDown();
    }
  }

  _handleMouseOut() {
    if(!this.state.mobileSettingsMenuOpen) {
      this._hideDropDown();
    }
  }

  _showDropDown() {
    this._isDropDownOpen = true;
    this.$.container__select_control.classList.add('open');
  }

  _hideDropDown() {
    this._isDropDownOpen = false;
    this.$.container__select_control.classList.remove('open');
  }

  _handleClick() {
    if(this._isDropDownOpen) {
      this._hideDropDown();
    } else {
      this._showDropDown();
    }
  }

  _handleDropDownElementClick(e) {
    this.selectedValue = e.model.item.value;
    this.dispatchEvent(new CustomEvent('change'));

    if(!this.state.mobileSettingsMenuOpen) {
      this._hideDropDown();
    }
  }

  _getSelectedItem(items, selectedValue) {
    if(items) {
      return items.find(item => item.value === selectedValue);
    }
  }

  _mobileSettingsMenuChanged(menuOpen) {
    if(menuOpen) {
      if (this.isInMobileMenu) {
        this._showDropDown();
      } else {
        this._hideDropDown();
      }
    }
  }
}

window.customElements.define(SelectControl.is, SelectControl);
