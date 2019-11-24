import { Hoisting, Side } from '../../flagwaver';
import HashState from '../../hashstate';
import { SceneryBackground } from '../constants';
import { setFileRecord } from '../redux/modules/fileRecord';
import flagGroup, { setFlagGroupOptions } from '../redux/modules/flagGroup';
import scenery, { setSceneryOptions } from '../redux/modules/scenery';

const flagGroupDefaults = flagGroup(undefined, {});
const sceneryDefaults = scenery(undefined, {});

function parseEnumValue(enumObject, string) {
    const b = string.toLowerCase();

    return Object.values(enumObject).find(a => a.toLowerCase() === b) || null;
}

const hashState = new HashState({
    'src': {
        defaultValue: flagGroupDefaults.imageSrc,
        parse: value => decodeURIComponent(value),
        stringify: value => encodeURIComponent(value)
    },
    'hoisting': {
        defaultValue: flagGroupDefaults.hoisting,
        parse: (string) => {
            if (string.match(/^dex(ter)?$/gi)) {
                return Hoisting.DEXTER;
            } else if (string.match(/^sin(ister)?$/gi)) {
                return Hoisting.SINISTER;
            }

            return null;
        },
        stringify: value => 'sin'
    },
    'orientation': {
        defaultValue: flagGroupDefaults.orientation,
        parse: string => parseEnumValue(Side, string)
    },
    'background': {
        defaultValue: sceneryDefaults.background,
        parse: string => parseEnumValue(SceneryBackground, string)
    }
});

function assignDefaults(defaults, options) {
    return Object.keys(defaults).reduce((result, key) => {
        const value = options[key];

        result[key] = (value != null) ? value : defaults[key];

        return result;
    }, {});
}

function mapStateToHash(state) {
    return {
        src: state.flagGroup.imageSrc,
        hoisting: state.flagGroup.hoisting,
        orientation: state.flagGroup.orientation,
        background: state.scenery.background
    };
}

function mapStateFromHash(state) {
    return {
        fileRecord: {
            url: state.src,
            file: null
        },
        flagGroup: assignDefaults(flagGroupDefaults, {
            imageSrc: state.src,
            hoisting: state.hoisting,
            orientation: state.orientation
        }),
        scenery: {
            background: state.background
        }
    };
}

function isValidState(state) {
    return (
        // Has an image
        !!state.flagGroup.imageSrc &&
        // Not a local file
        !state.fileRecord.file &&
        // File selection has been applied to flag
        state.fileRecord.url === state.flagGroup.imageSrc
    );
}

function withLegacyFallbackSrc(state) {
    // Backwards compatibility for old link structure
    if (!state.src) {
        return {
            ...state,
            src: window.unescape(window.location.hash.slice(1))
        };
    }

    return state;
}

function withLegacyFallbackTopEdge(state) {
    // Backwards compatibility for old topedge param
    if (state.topedge && state.orientation === flagGroupDefaults.orientation) {
        return {
            ...state,
            orientation: state.topedge
        };
    }

    return state;
}

function withLegacyFallbacks(state) {
    return [
        withLegacyFallbackSrc,
        withLegacyFallbackTopEdge
    ].reduce((result, fn) => fn(result), state);
}

export function toHash(store) {
    const state = store.getState();

    if (isValidState(state)) {
        hashState.setState(mapStateToHash(state));
    } else {
        hashState.setState(null);
    }
}

export function fromHash(store) {
    const state = mapStateFromHash(withLegacyFallbacks(hashState.getState()));

    store.dispatch(setFileRecord(state.fileRecord));
    store.dispatch(setFlagGroupOptions(state.flagGroup));
    store.dispatch(setSceneryOptions(state.scenery));
}
