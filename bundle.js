require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var sortValues = {
        x1: 0,
        y1: 1,
        x2: 2,
        y2: 3,
        rx: 4,
        ry: 5,
        xrotate: 6,
        largearc: 7,
        sweep: 8,
        x: 9,
        y: 10
    };

/*
    vsvg-paths
    ---------------------------------------------------
    this is a small module to encode decode svg pathing

    encode - encode object collection to path string
    params
        path { Array } - an array of points some exmaple points ar as follows
            [ 
                { x: 5, y: 5 }, // moveto
                { x: 100, y: 200 }, // lineto
                { x1: 100 , y1: 100, x2: 250, y2: 100, x: 250, y: 200 } // curveto
                { x2: 400, y2: 300, x: 400, y: 200 } // shorthand curve
                { x: 500 } // horizontal line
                { y: 100 } // vertical line
            ]
            with encode to: M5 5 L100 100 C100 100 250 100 250 200 S400 300 400 200 H500 V100
        isRelative { Boolean } - flag to make paths relative

*/

module.exports.encode = 
function encode( path, isRelative ) {
    
    if ( !Array.isArray( path ) ) {
        return;
    }
    var instructions = path.map( getInstruction ),
        values;

    if ( isRelative ) {
        instructions = instructions.map( mapLowerCase );
    }
    values = path.map( keyValueArray ) // [ [ [ y, 0 ], [ x, 0 ] ] ]
            .map( sortPoints ) // [ [ x, 0 ], [ y, 0 ] ] according to sort values
            .map( stringifyPoints( instructions ) );  // [ 'M0 0' ];
    
    return values.join( ' ' );
};

var keyValueArray =
module.exports._keyValueArray =
function keyValueArray( points ) {
    var ret = [];
    for( var key in points ) {
        ret.push( [ key, points[ key ] ] );
    }
    return ret;
};

var mapLowerCase =
module.exports._mapLowerCase = 
function mapLowerCase ( str ) {
    return str.toLowerCase();
};

var getValue =
module.exports._getValue =
function getValue(  instr ) {
    return function ( point, index ) {
        return ( !index ? instr : '' ) + point[ 1 ];
    }
};

var sortValue =
module.exports._sortValue =
function sortValue ( prev, cur ) {
    return sortValues[ prev[ 0 ] ] - sortValues[ cur[ 0 ] ];
};

var sortPoints =
module.exports._sortPoints =
function sortPoints ( points ) {
    return points.sort( sortValue );
};

var stringifyPoints =
module.exports._stringifyPoints =
function stringifyPoints( instructions ) {
    return function( point, index ) {
        if ( !point.length ) {
            return instructions[ index ]; // should be a close
        }
        return point.map( getValue( instructions[ index ] ) ).join( ' ' );
    }
};

var isValid =
module.exports._isValid =
function isValid ( value ) {
    if ( isNaN( value ) ) {
        return false;
    }
    return value || typeof value === 'number';
};

var getInstruction =
module.exports._getInstruction =
function getInstruction ( points, index ) {
    if ( isValid( points.x2 )  && isValid( points.y2 ) && isValid( points.x1 ) && isValid( points.y1 ) ) {
        return 'C';
    }
    if ( isValid( points.rx ) && isValid( points.ry ) ) {
        return 'A';
    }
    if ( isValid( points.x1 ) && isValid( points.y1 ) ) {
        return 'Q';
    }
    if ( isValid( points.x2 ) && isValid( points.y2 ) ) {
        return 'S';
    }
    if ( isValid( points.x ) && isValid( points.y ) ) {
        if ( !index ) {
            return 'M';
        }
        return 'L';
    }
    if ( isValid( points.x ) ) {
        return 'H';
    }
    if ( isValid( points.y ) ) {
        return 'V';
    }
    return 'Z';
};


},{}],2:[function(require,module,exports){
'use strict';

var startTag = /^<([-A-Za-z0-9_:]+)(.*?)(\/?)>/g, // match opening tag
    endTag = /<\/([-A-Za-z0-9_:]+)[^>]*>/, // this just matches the first one
    attr = /([-A-Za-z0-9_:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g; // match tag attributes

exports.parse = parse;

function makeArray( arr ) {
    return Array.prototype.slice.call( arr, 0 );
}

/*
    getAttributes - turns an array of attributes into a key value object
    params
        attributes { Array } - array of strings eg. [ 'x="5"' ]
    returns
        attributes { Object } - object of key values eg. { x: '5' }
*/

var getAttributes =
exports.getAttributes = function getAttributes( attributes ) {
    var _attributes = {};

    function addToAttributes( keyvalue ) {
        var arr = keyvalue.split( /=/ ),
            key = arr[ 0 ],
            value = arr[ 1 ] ? arr[ 1 ].slice( 1 ).slice( 0, -1 ) : '';

        _attributes[ key ] = value;
    }

    attributes.forEach( addToAttributes );

    return _attributes;
};

/*
    getTagIndex - given a tagName it will return the index of the last tag that matches the tagName
    params
        tagName { String } - the tagName eg, svg, text, line
        tags { Array } - array of tags, the tag object has a tagName variable that is matched against the tagName
    returns
        index { Number } - returns index of tag, or -1 if not in array
*/

var getTagIndex =
exports.getTagIndex = function getTagIndex( tagName, tags ) {
    for ( var i = tags.length - 1; i >= 0; i -= 1 ) {
        if ( tags[i].tagName === tagName ) {
            return i;
        }
    }
    return -1;
};

/*
    getLastOpenTag - gets the index of the last opened tag
    params
        tags { Array } - array of tags, the tag object has a closed variable that is test which
            indicates if the tag is closed. Array is ran through in reverse
    returns
        index { Number } - returns index of tag, or -1 if not in array
*/

var getLastOpenTag =
exports.getLastOpenTag = function getLastOpenTag( tags ) {
   for ( var i = tags.length - 1; i >= 0; i -= 1 ) {
        if ( !tags[ i ].closed ) {
            return i;
        }
   } 
   return -1;
};

/*
    createTree - turns an array of elements and turns them into tree based off position array
    params
        tags { Array } - array of tags, the tag object consist of three main things, tagName, position, attributes
    returns
        attributes { Object } - object which is a nest object representation of the original svg
*/

var createTree =
exports.createTree = function createTree( tags ) {

    var _tags = [];

    function getArray( position, arr ) {
        var _position = makeArray( position );
        if ( _position.length === 1 ) {
            return arr;
        }
        var next = arr[ _position[ 0 ] ].children;
        _position.shift();
        return getArray( _position, next );
    }

    function addTagToTree( tag ) {
        var arr = getArray( tag.position, _tags );
        arr.push( tag );
    }

    tags.forEach( addTagToTree );
    return _tags;

};



/*
    parse - will parse a xml string and turn it into an array of tags
    params
        xml { String } - a xml string eg. '<svg><line /></svg>'
    returns
        index { Array } - array of tags in a tree form same as the structure as the xml string
        
        eg.
            [{
                tagName: 'svg',
                attributes: {},
                position: [ 0 ]
                children: [{
                    tagName: 'line',
                    attributes: {},
                    children: [],
                    postion: [ 0, 0 ]
                }]
            }]

*/

function parse( xml ) {

    xml = xml.replace( /(\r\n|\n|\r)/gm, '' ); // remove all line breaks

    var tags = [],
        position = [ 0 ], // initial position
        openTag, 
        attributes,
        end,
        text,
        index,
        prevTag,
        prevLength,
        closed,
        tagName,
        tag;

    while ( xml ) { // we carve away at the xml variable

        // this checks to see if the previous string length is same as 
        // the current string length
        if ( xml.length === prevLength ) {
            throw new Error( 'Failed to parse SVG at chars: ' + xml.substring( 0, 5 ) );
        }
        // set prevLength
        prevLength = xml.length;

        xml = xml.trim(); // there is some issues with open tag if this is not done

        openTag = xml.match( startTag );

        if ( openTag ) { // if there is an open tag grab the attribute, and remove tag from xml string
            openTag = openTag[ 0 ];
            attributes = openTag.match( attr );
            xml = xml.substring( openTag.length ); 
            // reseting some vars
            text = null;
            prevTag = null;
            closed = null;
            if ( /\/>$/.test( openTag ) ) { // testing for self closing tags
                closed = true;
            }
        }
        else {
            end = xml.match( endTag ); // see if there is an end tag
            attributes = [];
            if ( end ) { // if there is a end tag find the last tag with same name, set text, and remove data from xml string
                index = getTagIndex( end[ 1 ], tags ); 
                prevTag = tags[ index ];
                text = xml.slice( 0, end.index );
                xml = xml.substring( end.index + end[ 0 ].length );
            }
        }

        tagName = attributes.shift(); // tagName with be the first in array

        if ( tagName || text ) { // tagName or text will be set if it is somewhat of a good output

            tag = {
                tagName: tagName,
                attributes: getAttributes( attributes ), // convert to object
                children: [],
                text: text,
                inside: getLastOpenTag( tags ), // this is needed to get an accurate position
                closed: closed || !!text
            };

            if ( tag.inside > -1 ) {
                position.push( -1 ); // push this value it is sometime just cut off
                position[ tags[ tag.inside ].position.length ] += 1;
                position = position.slice( 0, tags[ tag.inside ].position.length + 1 );
                // eg. [ 0, 0, 1 ] this is a map of where this tag should be at
            }

            tag.position = makeArray( position );
            tags.push( tag ); // push the tag

        }

        if ( prevTag ) {
            prevTag.closed = true; // close the prevTag
        }

    }

    return createTree( tags ); // convert flat array to tree
}
},{}],3:[function(require,module,exports){

'use strict';

var tags = require( './tags' ),
    SvgNode = require( './svgNode' ),
    parser = require( 'vsvg-parser' ),
    methods = {};

/*
    runs and returns an object with all the tagNames eg. vsvg.style()
*/

module.exports = ( function() {
    tags.forEach( function( tagName ) {
        methods[ tagName ] = SvgNode.bind( null, tagName );
    } );
    return methods;
}( ) );


/*
    vsvg::_eachTag - utility to loop through the children of results of a parsed svg 
    string to turn the structure into vsvg tags.

    params
        tag { Object } - a tag object returned from parser.parse

    returns
        elem { Object } - a svgNode or textNode
*/

var _eachTag =
methods._eachTag = function _eachTag( tag ) {
 
    var elem;

    if ( tag.tagName && methods[ tag.tagName ] ) {

        elem = methods[ tag.tagName ]( tag.attributes );
        if ( elem.children ) {    

            for( var i = 0; i < tag.children.length; i += 1 ) {

                var _elem = _eachTag( tag.children[ i ] );

                if ( typeof _elem === 'string' ) {

                    elem.innerText = _elem;
                } else {

                    elem.appendChild( _elem );
                }
            }
        }

        return elem;
    }

    return tag.text || '';
};

/*
    vsvg::parse - A wrapper around parser.parse to create vsvg Elements
    out of the return of parser.parse

    params
        svg { String } - a compiled string version of a svg to be parsed

    returns 
        tags { Array } - an array of svgNodes
*/
var parse =
methods.parse = function( svg ) {
    var parsedSVG;
    try {
        parsedSVG = parser.parse( svg );
    } catch ( e ) {
        return null;
    }
    return parsedSVG.map( _eachTag );
};

/*
    vsvg::_addNodeToVNode - adds regular DOM node to virtual node to allow for
    method proxing to actual dom nodes. Als o recusivly jumps into children and 
    attempts to add those nodes as well.

    params 
        node { Object } - a DOM node
        vNode { object } - a virtual svgNode
*/

var addNodeToVNode =
methods._addNodeToVNode = function( node, vNode ) {
    
    function eachChild( _vNode, index ) {
        addNodeToVNode( node.children[ index ], _vNode ); // recursivly jump down tree
    }

    vNode.children.forEach( eachChild ); // loop through all the children
    vNode._node = node;// attach node to vNode
};

/*
    vsvg::mount - mounts to a actual dom node and adds children  dom nodes to virtual tree
    as well.

    params 
        el { Object } - an entry point DOM node

    returns
        elem { Object } - a virtual representation of the DOM node
*/

methods.mount = function( el ) {
    var svg = el.outerHTML,
        tagTree = parse( svg );

    addNodeToVNode( el, tagTree[ 0 ] ); // start walking the parsed tree 
    return tagTree[ 0 ];
};
},{"./svgNode":4,"./tags":5,"vsvg-parser":2}],4:[function(require,module,exports){

'use strict';

var utils = require( './utils' ),
    TextNode = require( './textNode' ),
    namespace = 'http://www.w3.org/2000/svg';

module.exports = SvgNode;

/*
    SvgNode - creates an svg node
    params
        tagName { String } - name of tag to create
        _attribute { Object } - an object with attribute declarations
    returns
        this { SvgNode Object } - an object with a number of methods to
            manipulate element

    TODO make toHTML serve back self closing tags 
*/

function SvgNode( tagName, attributes, vnodes ) {

    var rest = utils.makeArray( arguments, 2 );
    if ( !( this instanceof SvgNode ) ) { // magical invocation
        return new SvgNode( tagName, attributes, rest );
    }
    
    attributes = Object.create( attributes || {} );
    this.guid = utils.guid();
    this.tagName = tagName;
    this._children = [];
    this.styles = attributes.style ? utils.styleToObject( attributes.style ) : {};
    attributes.style = this.styles;
    this._attributes = attributes;
    if ( typeof document === 'object' ) { // auto create element if in client
        this._node = document.createElementNS( namespace, tagName );
        for ( var attribute in attributes ) {
            var value = attributes[ attribute ];

            if ( attribute === 'style' ) {
                value = utils.objToStyles( value );
            }

            this._node.setAttribute( attribute, value );
        }
    }

    if ( Array.isArray( vnodes ) && vnodes.length  ) {
        vnodes.filter( SvgNode.isNode ).forEach( this.appendChild.bind( this ) );
    }
}

/*
    SvgNode.isNode -  checks to see if node is a instance of SvgNode
    params
        vnode { Mixed } - a value to test against the instance of SvgNode
 */

SvgNode.isNode = function( vnode ) {
    return vnode instanceof SvgNode;
};

SvgNode.prototype = {

    /*
        SvgNode::insertBefore - inserts new child before a referanced child
        params
            elem { SvgNode } - a new element
            refElem { SvgNode } - an exsisting child element
    */

    insertBefore: function ( elem, refElem ) {
        var index = utils.getElementIndex( refElem, this._children );
        this.removeChild( elem ); // this needs to be revised to be more like normal html spec
        this._children.splice( index, 0, elem );
        if ( this._node && elem._node && refElem._node ) {
            this._node.insertBefore( elem._node, refElem._node );
        }
    },

    /*
        SvgNode::removeChild - removes a child element from child array
        params
            elem { SvgNode } - an exsisting child element to be removed
    */


    removeChild: function ( elem ) {
        var index = utils.getElementIndex( elem, this._children );
        if ( index === -1 ) {
            return;
        }
        this._children.splice( index, 1 ); 
        if ( this._node && elem._node ) {
            this._node.removeChild( elem._node );
        }
    },

    /*
        SvgNode::replaceChild - removes a child element from child array and add a new one
        params
            elem { SvgNode } - an exsisting child element to be removed
            replaceElem { SvgNode } - an element to replace removed elem
    */


    replaceChild: function ( elem, replaceElem ) {
        var index = utils.getElementIndex( elem, this._children );
        if ( index === -1 ) {
            return;
        }
        this._children.splice( index, 1, replaceElem ); 
        if ( this._node && elem._node && replaceElem._node ) {
            this._node.replaceChild( replaceElem._node, elem._node );
        }
    },

    /*
        SvgNode::appendChild - appends a child element from child array
        params
            elem { SvgNode } - an exsisting child element to be appended
    */

    appendChild: function ( elem ) {
        this.removeChild( elem ); // remove any old instances
        elem.parentNode = this;
        this._children.push( elem );
        if ( this._node && elem._node ) {
            this._node.appendChild( elem._node );
        }
    },

    /*
        SvgNode::_removeTextNodes - a utility to remove text nodes from array
        params
            node { SvgNode } - a node to test to see if its a text node
    */

    _removeTextNodes: function ( node ) {
        return !!node.tagName;
    },
    
    /*
        SvgNode::children [ getter ]
        returns 
            array of nodes that are not text nodes
    */

    get children () {
        return this._children.filter( this._removeTextNodes );
    },

    /*
        SvgNode::firstChild [ getter ] 
        returns 
            child { SvgNode } - first child or null
    */

    get firstChild ( ) {
        return this._children[ 0 ];
    },

    /*
        SvgNode::toHTML - compiles tags for the element and child elements
        returns
            html { String } - the html ( svg ) compilied to a string form
    */

    toHTML: function ( ) {
        return '<' + 
            this.tagName + 
            ' ' + 
            utils.objToAttributes( this._attributes || {} ) + 
            '>' + 
            this._children.map( utils.mapElementsToHTML ).join('') +
            '</' +
            this.tagName +
            '>';
    },

    /*
        SvgNode::toText - compiles element inner text nodes to strings
        returns
            text { String } - the text inside of elements
    */

    toText: function( ) {
        return this._children.map( utils.mapElementsToText ).join('');
    },

    /*
        SvgNode::getAttribute - get attribute of element
        params 
            key { String } - attribute name 
        returns
            value { Mixed } - the value of the attribute
    */

    getAttribute: function( key ) {
        return this._attributes[ key ];
    },

    /*
        SvgNode::setAttribute - set attribute of element
        params 
            key { String } - attribute name 
            value { Mixed } - the value of the attribute
    */

    setAttribute: function( key, value ) {
        this._attributes[ key ] = value;
        if ( this._node ) {
            this._node.setAttribute( key, value );
        }
    },

    /*
        SvgNode::attributes [ getter ] - returns the actual attribute object
        returns 
            attributes { Object } - object of attributes key values 
    */

    get attributes ( ) {
        return this._attributes;
    },

    /*
        SvgNode::attributes [ setter ] - blocks the direct setting of attributes
        returns 
            attributes { Mixed } - value attempting to set attibutes to 
    */

    set attributes ( value ) {
        return value; // block from directly setting
    },

    /*
        SvgNode::outerHTML [ getter ] - returns same as toHTML();
        returns 
            html { String } - compiled version of element and children
    */

    get outerHTML () {
        return this.toHTML();
    },

    /*
        SvgNode::innerHTML [ getter ]
        returns 
            html { String } - compiled version of element's children
    */

    get innerHTML () {
        return this._children.map( utils.mapElementsToHTML ).join('');
    },

    /*
        SvgNode::innerHTML [ setter ]
        params 
            html { String } - compiled version of element's children
    */

    set  innerHTML ( html ) {
        var vsvg = require( '../' ); // defer require so everything is loaded

        if ( this._node ) {
            this._node.innerHTML = html;
            this._children = vsvg.mount( this._node ).children;
        }
        else {
            this._children = vsvg.parse( html ); 
        }
    },

    /*
        SvgNode::innerText [ getter ]
        returns 
            html { String } - current does the exact same thing as innerHTML
    */

    get innerText () {
        return this.toText();
    },


    /*
        SvgNode::innerText [ setter ]
        params
            value { String } - This creates a textNode with the text given in it,
                will also remove any other Nodes from current element
    */

    set innerText ( value ) {
        this._children.length = 0; // empty array
        this._children.push( new TextNode( value, {
            unsafe: this.tagName === 'style' 
        } ) ); // style tags need no escape
        if ( this._node ) {
            this._node.innerText = value;
        }
    }
};
},{"../":"vsvg","./textNode":6,"./utils":7}],5:[function(require,module,exports){

'use strict';

/*
    All current svg tags
*/

module.exports = [
    "a",
    "altGlyph",
    "altGlyphDef",
    "altGlyphItem",
    "animate",
    "animateColor",
    "animateMotion",
    "animateTransform",
    "circle",
    "clipPath",
    "color-profile",
    "cursor",
    "defs",
    "desc",
    "ellipse",
    "feBlend",
    "feColorMatrix",
    "feComponentTransfer",
    "feComposite",
    "feConvolveMatrix",
    "feDiffuseLighting",
    "feDisplacementMap",
    "feDistantLight",
    "feFlood",
    "feFuncA",
    "feFuncB",
    "feFuncG",
    "feFuncR",
    "feGaussianBlur",
    "feImage",
    "feMerge",
    "feMergeNode",
    "feMorphology",
    "feOffset",
    "fePointLight",
    "feSpecularLighting",
    "feSpotLight",
    "feTile",
    "feTurbulence",
    "filter",
    "font",
    "font-face",
    "font-face-format",
    "font-face-name",
    "font-face-src",
    "font-face-uri",
    "foreignObject",
    "g",
    "glyph",
    "glyphRef",
    "hkern",
    "image",
    "line",
    "linearGradient",
    "marker",
    "mask",
    "metadata",
    "missing-glyph",
    "mpath",
    "path",
    "pattern",
    "polygon",
    "polyline",
    "radialGradient",
    "rect",
    "script",
    "set",
    "stop",
    "style",
    "svg",
    "span",
    "switch",
    "symbol",
    "text",
    "textPath",
    "title",
    "tref",
    "tspan",
    "use",
    "view",
    "vkern"
];
},{}],6:[function(require,module,exports){

'use strict';

var utils = require( './utils' );

module.exports = TextNode;

function TextNode ( text, options ) {
    if ( !( this instanceof TextNode ) ) { // magical invocation
        return new TextNode( text, options );
    }
    options = options || {};
    this.text = options.unsafe ? text : utils.escapeHTML( text );
}

TextNode.prototype = {
    toHTML: function( ) {
        return this.text;
    },
    toText: function( ) {
        return this.text;
    }
};
},{"./utils":7}],7:[function(require,module,exports){

'use strict';

/*
    s4 & guid - makes a unique idenifier for elements
*/
function s4( ) {
    return Math.floor( ( 1 + Math.random( ) ) * 0x10000 )
        .toString( 16 )
        .substring( 1 );
}


exports.guid = function guid( ) {
    return s4( ) + s4( ) + '-' + s4( ) + '-' + s4( ) + '-' +
        s4( ) + '-' + s4( ) + s4( ) + s4( );
};

/*
    objToStyle - compiles { key: value } to key:value;
    params
        styles { Object } - object of style declarations
    retruns
        ret { String } - compiled sting with css declarations 

    TODO - support camel case
*/

var objToStyles =
exports.objToStyles = function objToStyles( styles ) {
    var ret = '';
    for ( var prop in styles ) {
        ret += prop + ':' + styles[ prop ] + ';';
    }
    return ret;
};

/*
    styleToObject - decompilies key:value to { key: value };
    params
        styles { String } - compiled sting with css declarations
    retruns
        ret { Object } - object of style declarations
*/

exports.styleToObject = function styleToObject( styles ) {
    var ret = { };

    if ( typeof styles === 'object' ) {
        return styles;
    }

    styles.split( ';' ).map( keyVal ).forEach( addToReturn );

    function addToReturn ( keyval ) {
        ret[ keyval[ 0 ] ] = keyval[ 1 ];
    }

    function keyVal( str ) {
        return str.trim().split( ':' );
    }
    return ret;
};

/*
    objToAttribute - compiles { key: value } to key="value"
    params
        attributes { Object } - object of attribute declarations
            style objects will run through objToStyles
    returns
        ret { String } - compiled string with attribute declaration 

    TODO - support camel case
*/

exports.objToAttributes = function objToAttributes( attributes ) {
    var ret = '',
        value;
    for( var attr in attributes ) {
        value = attr === 'style' ? objToStyles( attributes[ attr ] ) : attributes[ attr ];
        if ( attr !== 'style' || value ) {
            ret += attr + '="' + value + '" ';
        }
    }
    return ret;
};

/*
    mapElementsToHTML - to be use with arr.map with run toHTML of each element
    params
        elem { SvgNode Object } - object created by calling tag().
    returns
        html { String } - compiled elem object
*/

exports.mapElementsToHTML = function mapElementsToHTML( elem ) {
    return elem.toHTML();
};

/*
    mapElementsToHTML - to be use with arr.map with run toHTML of each element
    params
        elem { SvgNode Object } - object created by calling tag().
    returns
        html { String } - compiled elem object
*/

exports.mapElementsToText = function mapElementsToText( elem ) {
    return elem.toText();
};

/*
    getElementIndex - get the index of the element in an array
    params
        elem { SvgNode Object } - object created by calling tag().
        arr { Array } - a collections of SvgNode Objects
    returns
        index { Number } - the index of SvgNode obj in collection
*/

exports.getElementIndex = function getElementIndex( elem, arr ) {
    var index = -1;
    arr.forEach( function( _elem, _index ) {
        if ( elem.guid === _elem.guid ) {
            index = _index;
        }
    } );
    return index;
};

/*
    escapeHTML - escapes HTML
    params
        html { String } - unescaped html
    returns
        text { String } - escaped html
*/

exports.escapeHTML = function escapeHTML( html ) {
  return String( html )
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/*
    makeArray - creates a copy of an array
    params
        arr { Array } - original array
    returns
        arr { Array } - new Array
*/

exports.makeArray = function makeArray( arr, index ) {
    return Array.prototype.slice.call( arr, index || 0 );
};

},{}],"vsvg-paths":[function(require,module,exports){

module.exports.encode = require( './src/encode' ).encode;

},{"./src/encode":1}],"vsvg":[function(require,module,exports){

// export out src svg
var vsvg = require( './src/' );

module.exports = vsvg;

if ( typeof window === 'object' ) {
    window.vsvg = vsvg;
}
},{"./src/":3}]},{},[])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvdnN2Zy1wYXRocy9zcmMvZW5jb2RlLmpzIiwibm9kZV9tb2R1bGVzL3Zzdmcvbm9kZV9tb2R1bGVzL3ZzdmctcGFyc2VyL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Zzdmcvc3JjL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3Zzdmcvc3JjL3N2Z05vZGUuanMiLCJub2RlX21vZHVsZXMvdnN2Zy9zcmMvdGFncy5qcyIsIm5vZGVfbW9kdWxlcy92c3ZnL3NyYy90ZXh0Tm9kZS5qcyIsIm5vZGVfbW9kdWxlcy92c3ZnL3NyYy91dGlscy5qcyIsIm5vZGVfbW9kdWxlcy92c3ZnLXBhdGhzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3ZzdmcvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlJQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMU5BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlKQTtBQUNBO0FBQ0E7O0FDRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIid1c2Ugc3RyaWN0JztcblxudmFyIHNvcnRWYWx1ZXMgPSB7XG4gICAgICAgIHgxOiAwLFxuICAgICAgICB5MTogMSxcbiAgICAgICAgeDI6IDIsXG4gICAgICAgIHkyOiAzLFxuICAgICAgICByeDogNCxcbiAgICAgICAgcnk6IDUsXG4gICAgICAgIHhyb3RhdGU6IDYsXG4gICAgICAgIGxhcmdlYXJjOiA3LFxuICAgICAgICBzd2VlcDogOCxcbiAgICAgICAgeDogOSxcbiAgICAgICAgeTogMTBcbiAgICB9O1xuXG4vKlxuICAgIHZzdmctcGF0aHNcbiAgICAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICB0aGlzIGlzIGEgc21hbGwgbW9kdWxlIHRvIGVuY29kZSBkZWNvZGUgc3ZnIHBhdGhpbmdcblxuICAgIGVuY29kZSAtIGVuY29kZSBvYmplY3QgY29sbGVjdGlvbiB0byBwYXRoIHN0cmluZ1xuICAgIHBhcmFtc1xuICAgICAgICBwYXRoIHsgQXJyYXkgfSAtIGFuIGFycmF5IG9mIHBvaW50cyBzb21lIGV4bWFwbGUgcG9pbnRzIGFyIGFzIGZvbGxvd3NcbiAgICAgICAgICAgIFsgXG4gICAgICAgICAgICAgICAgeyB4OiA1LCB5OiA1IH0sIC8vIG1vdmV0b1xuICAgICAgICAgICAgICAgIHsgeDogMTAwLCB5OiAyMDAgfSwgLy8gbGluZXRvXG4gICAgICAgICAgICAgICAgeyB4MTogMTAwICwgeTE6IDEwMCwgeDI6IDI1MCwgeTI6IDEwMCwgeDogMjUwLCB5OiAyMDAgfSAvLyBjdXJ2ZXRvXG4gICAgICAgICAgICAgICAgeyB4MjogNDAwLCB5MjogMzAwLCB4OiA0MDAsIHk6IDIwMCB9IC8vIHNob3J0aGFuZCBjdXJ2ZVxuICAgICAgICAgICAgICAgIHsgeDogNTAwIH0gLy8gaG9yaXpvbnRhbCBsaW5lXG4gICAgICAgICAgICAgICAgeyB5OiAxMDAgfSAvLyB2ZXJ0aWNhbCBsaW5lXG4gICAgICAgICAgICBdXG4gICAgICAgICAgICB3aXRoIGVuY29kZSB0bzogTTUgNSBMMTAwIDEwMCBDMTAwIDEwMCAyNTAgMTAwIDI1MCAyMDAgUzQwMCAzMDAgNDAwIDIwMCBINTAwIFYxMDBcbiAgICAgICAgaXNSZWxhdGl2ZSB7IEJvb2xlYW4gfSAtIGZsYWcgdG8gbWFrZSBwYXRocyByZWxhdGl2ZVxuXG4qL1xuXG5tb2R1bGUuZXhwb3J0cy5lbmNvZGUgPSBcbmZ1bmN0aW9uIGVuY29kZSggcGF0aCwgaXNSZWxhdGl2ZSApIHtcbiAgICBcbiAgICBpZiAoICFBcnJheS5pc0FycmF5KCBwYXRoICkgKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIGluc3RydWN0aW9ucyA9IHBhdGgubWFwKCBnZXRJbnN0cnVjdGlvbiApLFxuICAgICAgICB2YWx1ZXM7XG5cbiAgICBpZiAoIGlzUmVsYXRpdmUgKSB7XG4gICAgICAgIGluc3RydWN0aW9ucyA9IGluc3RydWN0aW9ucy5tYXAoIG1hcExvd2VyQ2FzZSApO1xuICAgIH1cbiAgICB2YWx1ZXMgPSBwYXRoLm1hcCgga2V5VmFsdWVBcnJheSApIC8vIFsgWyBbIHksIDAgXSwgWyB4LCAwIF0gXSBdXG4gICAgICAgICAgICAubWFwKCBzb3J0UG9pbnRzICkgLy8gWyBbIHgsIDAgXSwgWyB5LCAwIF0gXSBhY2NvcmRpbmcgdG8gc29ydCB2YWx1ZXNcbiAgICAgICAgICAgIC5tYXAoIHN0cmluZ2lmeVBvaW50cyggaW5zdHJ1Y3Rpb25zICkgKTsgIC8vIFsgJ00wIDAnIF07XG4gICAgXG4gICAgcmV0dXJuIHZhbHVlcy5qb2luKCAnICcgKTtcbn07XG5cbnZhciBrZXlWYWx1ZUFycmF5ID1cbm1vZHVsZS5leHBvcnRzLl9rZXlWYWx1ZUFycmF5ID1cbmZ1bmN0aW9uIGtleVZhbHVlQXJyYXkoIHBvaW50cyApIHtcbiAgICB2YXIgcmV0ID0gW107XG4gICAgZm9yKCB2YXIga2V5IGluIHBvaW50cyApIHtcbiAgICAgICAgcmV0LnB1c2goIFsga2V5LCBwb2ludHNbIGtleSBdIF0gKTtcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbnZhciBtYXBMb3dlckNhc2UgPVxubW9kdWxlLmV4cG9ydHMuX21hcExvd2VyQ2FzZSA9IFxuZnVuY3Rpb24gbWFwTG93ZXJDYXNlICggc3RyICkge1xuICAgIHJldHVybiBzdHIudG9Mb3dlckNhc2UoKTtcbn07XG5cbnZhciBnZXRWYWx1ZSA9XG5tb2R1bGUuZXhwb3J0cy5fZ2V0VmFsdWUgPVxuZnVuY3Rpb24gZ2V0VmFsdWUoICBpbnN0ciApIHtcbiAgICByZXR1cm4gZnVuY3Rpb24gKCBwb2ludCwgaW5kZXggKSB7XG4gICAgICAgIHJldHVybiAoICFpbmRleCA/IGluc3RyIDogJycgKSArIHBvaW50WyAxIF07XG4gICAgfVxufTtcblxudmFyIHNvcnRWYWx1ZSA9XG5tb2R1bGUuZXhwb3J0cy5fc29ydFZhbHVlID1cbmZ1bmN0aW9uIHNvcnRWYWx1ZSAoIHByZXYsIGN1ciApIHtcbiAgICByZXR1cm4gc29ydFZhbHVlc1sgcHJldlsgMCBdIF0gLSBzb3J0VmFsdWVzWyBjdXJbIDAgXSBdO1xufTtcblxudmFyIHNvcnRQb2ludHMgPVxubW9kdWxlLmV4cG9ydHMuX3NvcnRQb2ludHMgPVxuZnVuY3Rpb24gc29ydFBvaW50cyAoIHBvaW50cyApIHtcbiAgICByZXR1cm4gcG9pbnRzLnNvcnQoIHNvcnRWYWx1ZSApO1xufTtcblxudmFyIHN0cmluZ2lmeVBvaW50cyA9XG5tb2R1bGUuZXhwb3J0cy5fc3RyaW5naWZ5UG9pbnRzID1cbmZ1bmN0aW9uIHN0cmluZ2lmeVBvaW50cyggaW5zdHJ1Y3Rpb25zICkge1xuICAgIHJldHVybiBmdW5jdGlvbiggcG9pbnQsIGluZGV4ICkge1xuICAgICAgICBpZiAoICFwb2ludC5sZW5ndGggKSB7XG4gICAgICAgICAgICByZXR1cm4gaW5zdHJ1Y3Rpb25zWyBpbmRleCBdOyAvLyBzaG91bGQgYmUgYSBjbG9zZVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBwb2ludC5tYXAoIGdldFZhbHVlKCBpbnN0cnVjdGlvbnNbIGluZGV4IF0gKSApLmpvaW4oICcgJyApO1xuICAgIH1cbn07XG5cbnZhciBpc1ZhbGlkID1cbm1vZHVsZS5leHBvcnRzLl9pc1ZhbGlkID1cbmZ1bmN0aW9uIGlzVmFsaWQgKCB2YWx1ZSApIHtcbiAgICBpZiAoIGlzTmFOKCB2YWx1ZSApICkge1xuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgPT09ICdudW1iZXInO1xufTtcblxudmFyIGdldEluc3RydWN0aW9uID1cbm1vZHVsZS5leHBvcnRzLl9nZXRJbnN0cnVjdGlvbiA9XG5mdW5jdGlvbiBnZXRJbnN0cnVjdGlvbiAoIHBvaW50cywgaW5kZXggKSB7XG4gICAgaWYgKCBpc1ZhbGlkKCBwb2ludHMueDIgKSAgJiYgaXNWYWxpZCggcG9pbnRzLnkyICkgJiYgaXNWYWxpZCggcG9pbnRzLngxICkgJiYgaXNWYWxpZCggcG9pbnRzLnkxICkgKSB7XG4gICAgICAgIHJldHVybiAnQyc7XG4gICAgfVxuICAgIGlmICggaXNWYWxpZCggcG9pbnRzLnJ4ICkgJiYgaXNWYWxpZCggcG9pbnRzLnJ5ICkgKSB7XG4gICAgICAgIHJldHVybiAnQSc7XG4gICAgfVxuICAgIGlmICggaXNWYWxpZCggcG9pbnRzLngxICkgJiYgaXNWYWxpZCggcG9pbnRzLnkxICkgKSB7XG4gICAgICAgIHJldHVybiAnUSc7XG4gICAgfVxuICAgIGlmICggaXNWYWxpZCggcG9pbnRzLngyICkgJiYgaXNWYWxpZCggcG9pbnRzLnkyICkgKSB7XG4gICAgICAgIHJldHVybiAnUyc7XG4gICAgfVxuICAgIGlmICggaXNWYWxpZCggcG9pbnRzLnggKSAmJiBpc1ZhbGlkKCBwb2ludHMueSApICkge1xuICAgICAgICBpZiAoICFpbmRleCApIHtcbiAgICAgICAgICAgIHJldHVybiAnTSc7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuICdMJztcbiAgICB9XG4gICAgaWYgKCBpc1ZhbGlkKCBwb2ludHMueCApICkge1xuICAgICAgICByZXR1cm4gJ0gnO1xuICAgIH1cbiAgICBpZiAoIGlzVmFsaWQoIHBvaW50cy55ICkgKSB7XG4gICAgICAgIHJldHVybiAnVic7XG4gICAgfVxuICAgIHJldHVybiAnWic7XG59O1xuXG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBzdGFydFRhZyA9IC9ePChbLUEtWmEtejAtOV86XSspKC4qPykoXFwvPyk+L2csIC8vIG1hdGNoIG9wZW5pbmcgdGFnXG4gICAgZW5kVGFnID0gLzxcXC8oWy1BLVphLXowLTlfOl0rKVtePl0qPi8sIC8vIHRoaXMganVzdCBtYXRjaGVzIHRoZSBmaXJzdCBvbmVcbiAgICBhdHRyID0gLyhbLUEtWmEtejAtOV86XSspKD86XFxzKj1cXHMqKD86KD86XCIoKD86XFxcXC58W15cIl0pKilcIil8KD86JygoPzpcXFxcLnxbXiddKSopJyl8KFtePlxcc10rKSkpPy9nOyAvLyBtYXRjaCB0YWcgYXR0cmlidXRlc1xuXG5leHBvcnRzLnBhcnNlID0gcGFyc2U7XG5cbmZ1bmN0aW9uIG1ha2VBcnJheSggYXJyICkge1xuICAgIHJldHVybiBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbCggYXJyLCAwICk7XG59XG5cbi8qXG4gICAgZ2V0QXR0cmlidXRlcyAtIHR1cm5zIGFuIGFycmF5IG9mIGF0dHJpYnV0ZXMgaW50byBhIGtleSB2YWx1ZSBvYmplY3RcbiAgICBwYXJhbXNcbiAgICAgICAgYXR0cmlidXRlcyB7IEFycmF5IH0gLSBhcnJheSBvZiBzdHJpbmdzIGVnLiBbICd4PVwiNVwiJyBdXG4gICAgcmV0dXJuc1xuICAgICAgICBhdHRyaWJ1dGVzIHsgT2JqZWN0IH0gLSBvYmplY3Qgb2Yga2V5IHZhbHVlcyBlZy4geyB4OiAnNScgfVxuKi9cblxudmFyIGdldEF0dHJpYnV0ZXMgPVxuZXhwb3J0cy5nZXRBdHRyaWJ1dGVzID0gZnVuY3Rpb24gZ2V0QXR0cmlidXRlcyggYXR0cmlidXRlcyApIHtcbiAgICB2YXIgX2F0dHJpYnV0ZXMgPSB7fTtcblxuICAgIGZ1bmN0aW9uIGFkZFRvQXR0cmlidXRlcygga2V5dmFsdWUgKSB7XG4gICAgICAgIHZhciBhcnIgPSBrZXl2YWx1ZS5zcGxpdCggLz0vICksXG4gICAgICAgICAgICBrZXkgPSBhcnJbIDAgXSxcbiAgICAgICAgICAgIHZhbHVlID0gYXJyWyAxIF0gPyBhcnJbIDEgXS5zbGljZSggMSApLnNsaWNlKCAwLCAtMSApIDogJyc7XG5cbiAgICAgICAgX2F0dHJpYnV0ZXNbIGtleSBdID0gdmFsdWU7XG4gICAgfVxuXG4gICAgYXR0cmlidXRlcy5mb3JFYWNoKCBhZGRUb0F0dHJpYnV0ZXMgKTtcblxuICAgIHJldHVybiBfYXR0cmlidXRlcztcbn07XG5cbi8qXG4gICAgZ2V0VGFnSW5kZXggLSBnaXZlbiBhIHRhZ05hbWUgaXQgd2lsbCByZXR1cm4gdGhlIGluZGV4IG9mIHRoZSBsYXN0IHRhZyB0aGF0IG1hdGNoZXMgdGhlIHRhZ05hbWVcbiAgICBwYXJhbXNcbiAgICAgICAgdGFnTmFtZSB7IFN0cmluZyB9IC0gdGhlIHRhZ05hbWUgZWcsIHN2ZywgdGV4dCwgbGluZVxuICAgICAgICB0YWdzIHsgQXJyYXkgfSAtIGFycmF5IG9mIHRhZ3MsIHRoZSB0YWcgb2JqZWN0IGhhcyBhIHRhZ05hbWUgdmFyaWFibGUgdGhhdCBpcyBtYXRjaGVkIGFnYWluc3QgdGhlIHRhZ05hbWVcbiAgICByZXR1cm5zXG4gICAgICAgIGluZGV4IHsgTnVtYmVyIH0gLSByZXR1cm5zIGluZGV4IG9mIHRhZywgb3IgLTEgaWYgbm90IGluIGFycmF5XG4qL1xuXG52YXIgZ2V0VGFnSW5kZXggPVxuZXhwb3J0cy5nZXRUYWdJbmRleCA9IGZ1bmN0aW9uIGdldFRhZ0luZGV4KCB0YWdOYW1lLCB0YWdzICkge1xuICAgIGZvciAoIHZhciBpID0gdGFncy5sZW5ndGggLSAxOyBpID49IDA7IGkgLT0gMSApIHtcbiAgICAgICAgaWYgKCB0YWdzW2ldLnRhZ05hbWUgPT09IHRhZ05hbWUgKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gLTE7XG59O1xuXG4vKlxuICAgIGdldExhc3RPcGVuVGFnIC0gZ2V0cyB0aGUgaW5kZXggb2YgdGhlIGxhc3Qgb3BlbmVkIHRhZ1xuICAgIHBhcmFtc1xuICAgICAgICB0YWdzIHsgQXJyYXkgfSAtIGFycmF5IG9mIHRhZ3MsIHRoZSB0YWcgb2JqZWN0IGhhcyBhIGNsb3NlZCB2YXJpYWJsZSB0aGF0IGlzIHRlc3Qgd2hpY2hcbiAgICAgICAgICAgIGluZGljYXRlcyBpZiB0aGUgdGFnIGlzIGNsb3NlZC4gQXJyYXkgaXMgcmFuIHRocm91Z2ggaW4gcmV2ZXJzZVxuICAgIHJldHVybnNcbiAgICAgICAgaW5kZXggeyBOdW1iZXIgfSAtIHJldHVybnMgaW5kZXggb2YgdGFnLCBvciAtMSBpZiBub3QgaW4gYXJyYXlcbiovXG5cbnZhciBnZXRMYXN0T3BlblRhZyA9XG5leHBvcnRzLmdldExhc3RPcGVuVGFnID0gZnVuY3Rpb24gZ2V0TGFzdE9wZW5UYWcoIHRhZ3MgKSB7XG4gICBmb3IgKCB2YXIgaSA9IHRhZ3MubGVuZ3RoIC0gMTsgaSA+PSAwOyBpIC09IDEgKSB7XG4gICAgICAgIGlmICggIXRhZ3NbIGkgXS5jbG9zZWQgKSB7XG4gICAgICAgICAgICByZXR1cm4gaTtcbiAgICAgICAgfVxuICAgfSBcbiAgIHJldHVybiAtMTtcbn07XG5cbi8qXG4gICAgY3JlYXRlVHJlZSAtIHR1cm5zIGFuIGFycmF5IG9mIGVsZW1lbnRzIGFuZCB0dXJucyB0aGVtIGludG8gdHJlZSBiYXNlZCBvZmYgcG9zaXRpb24gYXJyYXlcbiAgICBwYXJhbXNcbiAgICAgICAgdGFncyB7IEFycmF5IH0gLSBhcnJheSBvZiB0YWdzLCB0aGUgdGFnIG9iamVjdCBjb25zaXN0IG9mIHRocmVlIG1haW4gdGhpbmdzLCB0YWdOYW1lLCBwb3NpdGlvbiwgYXR0cmlidXRlc1xuICAgIHJldHVybnNcbiAgICAgICAgYXR0cmlidXRlcyB7IE9iamVjdCB9IC0gb2JqZWN0IHdoaWNoIGlzIGEgbmVzdCBvYmplY3QgcmVwcmVzZW50YXRpb24gb2YgdGhlIG9yaWdpbmFsIHN2Z1xuKi9cblxudmFyIGNyZWF0ZVRyZWUgPVxuZXhwb3J0cy5jcmVhdGVUcmVlID0gZnVuY3Rpb24gY3JlYXRlVHJlZSggdGFncyApIHtcblxuICAgIHZhciBfdGFncyA9IFtdO1xuXG4gICAgZnVuY3Rpb24gZ2V0QXJyYXkoIHBvc2l0aW9uLCBhcnIgKSB7XG4gICAgICAgIHZhciBfcG9zaXRpb24gPSBtYWtlQXJyYXkoIHBvc2l0aW9uICk7XG4gICAgICAgIGlmICggX3Bvc2l0aW9uLmxlbmd0aCA9PT0gMSApIHtcbiAgICAgICAgICAgIHJldHVybiBhcnI7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIG5leHQgPSBhcnJbIF9wb3NpdGlvblsgMCBdIF0uY2hpbGRyZW47XG4gICAgICAgIF9wb3NpdGlvbi5zaGlmdCgpO1xuICAgICAgICByZXR1cm4gZ2V0QXJyYXkoIF9wb3NpdGlvbiwgbmV4dCApO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGFkZFRhZ1RvVHJlZSggdGFnICkge1xuICAgICAgICB2YXIgYXJyID0gZ2V0QXJyYXkoIHRhZy5wb3NpdGlvbiwgX3RhZ3MgKTtcbiAgICAgICAgYXJyLnB1c2goIHRhZyApO1xuICAgIH1cblxuICAgIHRhZ3MuZm9yRWFjaCggYWRkVGFnVG9UcmVlICk7XG4gICAgcmV0dXJuIF90YWdzO1xuXG59O1xuXG5cblxuLypcbiAgICBwYXJzZSAtIHdpbGwgcGFyc2UgYSB4bWwgc3RyaW5nIGFuZCB0dXJuIGl0IGludG8gYW4gYXJyYXkgb2YgdGFnc1xuICAgIHBhcmFtc1xuICAgICAgICB4bWwgeyBTdHJpbmcgfSAtIGEgeG1sIHN0cmluZyBlZy4gJzxzdmc+PGxpbmUgLz48L3N2Zz4nXG4gICAgcmV0dXJuc1xuICAgICAgICBpbmRleCB7IEFycmF5IH0gLSBhcnJheSBvZiB0YWdzIGluIGEgdHJlZSBmb3JtIHNhbWUgYXMgdGhlIHN0cnVjdHVyZSBhcyB0aGUgeG1sIHN0cmluZ1xuICAgICAgICBcbiAgICAgICAgZWcuXG4gICAgICAgICAgICBbe1xuICAgICAgICAgICAgICAgIHRhZ05hbWU6ICdzdmcnLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICAgICAgICAgIHBvc2l0aW9uOiBbIDAgXVxuICAgICAgICAgICAgICAgIGNoaWxkcmVuOiBbe1xuICAgICAgICAgICAgICAgICAgICB0YWdOYW1lOiAnbGluZScsXG4gICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IHt9LFxuICAgICAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgICAgICAgICAgICAgIHBvc3Rpb246IFsgMCwgMCBdXG4gICAgICAgICAgICAgICAgfV1cbiAgICAgICAgICAgIH1dXG5cbiovXG5cbmZ1bmN0aW9uIHBhcnNlKCB4bWwgKSB7XG5cbiAgICB4bWwgPSB4bWwucmVwbGFjZSggLyhcXHJcXG58XFxufFxccikvZ20sICcnICk7IC8vIHJlbW92ZSBhbGwgbGluZSBicmVha3NcblxuICAgIHZhciB0YWdzID0gW10sXG4gICAgICAgIHBvc2l0aW9uID0gWyAwIF0sIC8vIGluaXRpYWwgcG9zaXRpb25cbiAgICAgICAgb3BlblRhZywgXG4gICAgICAgIGF0dHJpYnV0ZXMsXG4gICAgICAgIGVuZCxcbiAgICAgICAgdGV4dCxcbiAgICAgICAgaW5kZXgsXG4gICAgICAgIHByZXZUYWcsXG4gICAgICAgIHByZXZMZW5ndGgsXG4gICAgICAgIGNsb3NlZCxcbiAgICAgICAgdGFnTmFtZSxcbiAgICAgICAgdGFnO1xuXG4gICAgd2hpbGUgKCB4bWwgKSB7IC8vIHdlIGNhcnZlIGF3YXkgYXQgdGhlIHhtbCB2YXJpYWJsZVxuXG4gICAgICAgIC8vIHRoaXMgY2hlY2tzIHRvIHNlZSBpZiB0aGUgcHJldmlvdXMgc3RyaW5nIGxlbmd0aCBpcyBzYW1lIGFzIFxuICAgICAgICAvLyB0aGUgY3VycmVudCBzdHJpbmcgbGVuZ3RoXG4gICAgICAgIGlmICggeG1sLmxlbmd0aCA9PT0gcHJldkxlbmd0aCApIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvciggJ0ZhaWxlZCB0byBwYXJzZSBTVkcgYXQgY2hhcnM6ICcgKyB4bWwuc3Vic3RyaW5nKCAwLCA1ICkgKTtcbiAgICAgICAgfVxuICAgICAgICAvLyBzZXQgcHJldkxlbmd0aFxuICAgICAgICBwcmV2TGVuZ3RoID0geG1sLmxlbmd0aDtcblxuICAgICAgICB4bWwgPSB4bWwudHJpbSgpOyAvLyB0aGVyZSBpcyBzb21lIGlzc3VlcyB3aXRoIG9wZW4gdGFnIGlmIHRoaXMgaXMgbm90IGRvbmVcblxuICAgICAgICBvcGVuVGFnID0geG1sLm1hdGNoKCBzdGFydFRhZyApO1xuXG4gICAgICAgIGlmICggb3BlblRhZyApIHsgLy8gaWYgdGhlcmUgaXMgYW4gb3BlbiB0YWcgZ3JhYiB0aGUgYXR0cmlidXRlLCBhbmQgcmVtb3ZlIHRhZyBmcm9tIHhtbCBzdHJpbmdcbiAgICAgICAgICAgIG9wZW5UYWcgPSBvcGVuVGFnWyAwIF07XG4gICAgICAgICAgICBhdHRyaWJ1dGVzID0gb3BlblRhZy5tYXRjaCggYXR0ciApO1xuICAgICAgICAgICAgeG1sID0geG1sLnN1YnN0cmluZyggb3BlblRhZy5sZW5ndGggKTsgXG4gICAgICAgICAgICAvLyByZXNldGluZyBzb21lIHZhcnNcbiAgICAgICAgICAgIHRleHQgPSBudWxsO1xuICAgICAgICAgICAgcHJldlRhZyA9IG51bGw7XG4gICAgICAgICAgICBjbG9zZWQgPSBudWxsO1xuICAgICAgICAgICAgaWYgKCAvXFwvPiQvLnRlc3QoIG9wZW5UYWcgKSApIHsgLy8gdGVzdGluZyBmb3Igc2VsZiBjbG9zaW5nIHRhZ3NcbiAgICAgICAgICAgICAgICBjbG9zZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgZW5kID0geG1sLm1hdGNoKCBlbmRUYWcgKTsgLy8gc2VlIGlmIHRoZXJlIGlzIGFuIGVuZCB0YWdcbiAgICAgICAgICAgIGF0dHJpYnV0ZXMgPSBbXTtcbiAgICAgICAgICAgIGlmICggZW5kICkgeyAvLyBpZiB0aGVyZSBpcyBhIGVuZCB0YWcgZmluZCB0aGUgbGFzdCB0YWcgd2l0aCBzYW1lIG5hbWUsIHNldCB0ZXh0LCBhbmQgcmVtb3ZlIGRhdGEgZnJvbSB4bWwgc3RyaW5nXG4gICAgICAgICAgICAgICAgaW5kZXggPSBnZXRUYWdJbmRleCggZW5kWyAxIF0sIHRhZ3MgKTsgXG4gICAgICAgICAgICAgICAgcHJldlRhZyA9IHRhZ3NbIGluZGV4IF07XG4gICAgICAgICAgICAgICAgdGV4dCA9IHhtbC5zbGljZSggMCwgZW5kLmluZGV4ICk7XG4gICAgICAgICAgICAgICAgeG1sID0geG1sLnN1YnN0cmluZyggZW5kLmluZGV4ICsgZW5kWyAwIF0ubGVuZ3RoICk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0YWdOYW1lID0gYXR0cmlidXRlcy5zaGlmdCgpOyAvLyB0YWdOYW1lIHdpdGggYmUgdGhlIGZpcnN0IGluIGFycmF5XG5cbiAgICAgICAgaWYgKCB0YWdOYW1lIHx8IHRleHQgKSB7IC8vIHRhZ05hbWUgb3IgdGV4dCB3aWxsIGJlIHNldCBpZiBpdCBpcyBzb21ld2hhdCBvZiBhIGdvb2Qgb3V0cHV0XG5cbiAgICAgICAgICAgIHRhZyA9IHtcbiAgICAgICAgICAgICAgICB0YWdOYW1lOiB0YWdOYW1lLFxuICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXM6IGdldEF0dHJpYnV0ZXMoIGF0dHJpYnV0ZXMgKSwgLy8gY29udmVydCB0byBvYmplY3RcbiAgICAgICAgICAgICAgICBjaGlsZHJlbjogW10sXG4gICAgICAgICAgICAgICAgdGV4dDogdGV4dCxcbiAgICAgICAgICAgICAgICBpbnNpZGU6IGdldExhc3RPcGVuVGFnKCB0YWdzICksIC8vIHRoaXMgaXMgbmVlZGVkIHRvIGdldCBhbiBhY2N1cmF0ZSBwb3NpdGlvblxuICAgICAgICAgICAgICAgIGNsb3NlZDogY2xvc2VkIHx8ICEhdGV4dFxuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgaWYgKCB0YWcuaW5zaWRlID4gLTEgKSB7XG4gICAgICAgICAgICAgICAgcG9zaXRpb24ucHVzaCggLTEgKTsgLy8gcHVzaCB0aGlzIHZhbHVlIGl0IGlzIHNvbWV0aW1lIGp1c3QgY3V0IG9mZlxuICAgICAgICAgICAgICAgIHBvc2l0aW9uWyB0YWdzWyB0YWcuaW5zaWRlIF0ucG9zaXRpb24ubGVuZ3RoIF0gKz0gMTtcbiAgICAgICAgICAgICAgICBwb3NpdGlvbiA9IHBvc2l0aW9uLnNsaWNlKCAwLCB0YWdzWyB0YWcuaW5zaWRlIF0ucG9zaXRpb24ubGVuZ3RoICsgMSApO1xuICAgICAgICAgICAgICAgIC8vIGVnLiBbIDAsIDAsIDEgXSB0aGlzIGlzIGEgbWFwIG9mIHdoZXJlIHRoaXMgdGFnIHNob3VsZCBiZSBhdFxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0YWcucG9zaXRpb24gPSBtYWtlQXJyYXkoIHBvc2l0aW9uICk7XG4gICAgICAgICAgICB0YWdzLnB1c2goIHRhZyApOyAvLyBwdXNoIHRoZSB0YWdcblxuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCBwcmV2VGFnICkge1xuICAgICAgICAgICAgcHJldlRhZy5jbG9zZWQgPSB0cnVlOyAvLyBjbG9zZSB0aGUgcHJldlRhZ1xuICAgICAgICB9XG5cbiAgICB9XG5cbiAgICByZXR1cm4gY3JlYXRlVHJlZSggdGFncyApOyAvLyBjb252ZXJ0IGZsYXQgYXJyYXkgdG8gdHJlZVxufSIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdGFncyA9IHJlcXVpcmUoICcuL3RhZ3MnICksXG4gICAgU3ZnTm9kZSA9IHJlcXVpcmUoICcuL3N2Z05vZGUnICksXG4gICAgcGFyc2VyID0gcmVxdWlyZSggJ3ZzdmctcGFyc2VyJyApLFxuICAgIG1ldGhvZHMgPSB7fTtcblxuLypcbiAgICBydW5zIGFuZCByZXR1cm5zIGFuIG9iamVjdCB3aXRoIGFsbCB0aGUgdGFnTmFtZXMgZWcuIHZzdmcuc3R5bGUoKVxuKi9cblxubW9kdWxlLmV4cG9ydHMgPSAoIGZ1bmN0aW9uKCkge1xuICAgIHRhZ3MuZm9yRWFjaCggZnVuY3Rpb24oIHRhZ05hbWUgKSB7XG4gICAgICAgIG1ldGhvZHNbIHRhZ05hbWUgXSA9IFN2Z05vZGUuYmluZCggbnVsbCwgdGFnTmFtZSApO1xuICAgIH0gKTtcbiAgICByZXR1cm4gbWV0aG9kcztcbn0oICkgKTtcblxuXG4vKlxuICAgIHZzdmc6Ol9lYWNoVGFnIC0gdXRpbGl0eSB0byBsb29wIHRocm91Z2ggdGhlIGNoaWxkcmVuIG9mIHJlc3VsdHMgb2YgYSBwYXJzZWQgc3ZnIFxuICAgIHN0cmluZyB0byB0dXJuIHRoZSBzdHJ1Y3R1cmUgaW50byB2c3ZnIHRhZ3MuXG5cbiAgICBwYXJhbXNcbiAgICAgICAgdGFnIHsgT2JqZWN0IH0gLSBhIHRhZyBvYmplY3QgcmV0dXJuZWQgZnJvbSBwYXJzZXIucGFyc2VcblxuICAgIHJldHVybnNcbiAgICAgICAgZWxlbSB7IE9iamVjdCB9IC0gYSBzdmdOb2RlIG9yIHRleHROb2RlXG4qL1xuXG52YXIgX2VhY2hUYWcgPVxubWV0aG9kcy5fZWFjaFRhZyA9IGZ1bmN0aW9uIF9lYWNoVGFnKCB0YWcgKSB7XG4gXG4gICAgdmFyIGVsZW07XG5cbiAgICBpZiAoIHRhZy50YWdOYW1lICYmIG1ldGhvZHNbIHRhZy50YWdOYW1lIF0gKSB7XG5cbiAgICAgICAgZWxlbSA9IG1ldGhvZHNbIHRhZy50YWdOYW1lIF0oIHRhZy5hdHRyaWJ1dGVzICk7XG4gICAgICAgIGlmICggZWxlbS5jaGlsZHJlbiApIHsgICAgXG5cbiAgICAgICAgICAgIGZvciggdmFyIGkgPSAwOyBpIDwgdGFnLmNoaWxkcmVuLmxlbmd0aDsgaSArPSAxICkge1xuXG4gICAgICAgICAgICAgICAgdmFyIF9lbGVtID0gX2VhY2hUYWcoIHRhZy5jaGlsZHJlblsgaSBdICk7XG5cbiAgICAgICAgICAgICAgICBpZiAoIHR5cGVvZiBfZWxlbSA9PT0gJ3N0cmluZycgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgZWxlbS5pbm5lclRleHQgPSBfZWxlbTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIGVsZW0uYXBwZW5kQ2hpbGQoIF9lbGVtICk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgcmV0dXJuIGVsZW07XG4gICAgfVxuXG4gICAgcmV0dXJuIHRhZy50ZXh0IHx8ICcnO1xufTtcblxuLypcbiAgICB2c3ZnOjpwYXJzZSAtIEEgd3JhcHBlciBhcm91bmQgcGFyc2VyLnBhcnNlIHRvIGNyZWF0ZSB2c3ZnIEVsZW1lbnRzXG4gICAgb3V0IG9mIHRoZSByZXR1cm4gb2YgcGFyc2VyLnBhcnNlXG5cbiAgICBwYXJhbXNcbiAgICAgICAgc3ZnIHsgU3RyaW5nIH0gLSBhIGNvbXBpbGVkIHN0cmluZyB2ZXJzaW9uIG9mIGEgc3ZnIHRvIGJlIHBhcnNlZFxuXG4gICAgcmV0dXJucyBcbiAgICAgICAgdGFncyB7IEFycmF5IH0gLSBhbiBhcnJheSBvZiBzdmdOb2Rlc1xuKi9cbnZhciBwYXJzZSA9XG5tZXRob2RzLnBhcnNlID0gZnVuY3Rpb24oIHN2ZyApIHtcbiAgICB2YXIgcGFyc2VkU1ZHO1xuICAgIHRyeSB7XG4gICAgICAgIHBhcnNlZFNWRyA9IHBhcnNlci5wYXJzZSggc3ZnICk7XG4gICAgfSBjYXRjaCAoIGUgKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICByZXR1cm4gcGFyc2VkU1ZHLm1hcCggX2VhY2hUYWcgKTtcbn07XG5cbi8qXG4gICAgdnN2Zzo6X2FkZE5vZGVUb1ZOb2RlIC0gYWRkcyByZWd1bGFyIERPTSBub2RlIHRvIHZpcnR1YWwgbm9kZSB0byBhbGxvdyBmb3JcbiAgICBtZXRob2QgcHJveGluZyB0byBhY3R1YWwgZG9tIG5vZGVzLiBBbHMgbyByZWN1c2l2bHkganVtcHMgaW50byBjaGlsZHJlbiBhbmQgXG4gICAgYXR0ZW1wdHMgdG8gYWRkIHRob3NlIG5vZGVzIGFzIHdlbGwuXG5cbiAgICBwYXJhbXMgXG4gICAgICAgIG5vZGUgeyBPYmplY3QgfSAtIGEgRE9NIG5vZGVcbiAgICAgICAgdk5vZGUgeyBvYmplY3QgfSAtIGEgdmlydHVhbCBzdmdOb2RlXG4qL1xuXG52YXIgYWRkTm9kZVRvVk5vZGUgPVxubWV0aG9kcy5fYWRkTm9kZVRvVk5vZGUgPSBmdW5jdGlvbiggbm9kZSwgdk5vZGUgKSB7XG4gICAgXG4gICAgZnVuY3Rpb24gZWFjaENoaWxkKCBfdk5vZGUsIGluZGV4ICkge1xuICAgICAgICBhZGROb2RlVG9WTm9kZSggbm9kZS5jaGlsZHJlblsgaW5kZXggXSwgX3ZOb2RlICk7IC8vIHJlY3Vyc2l2bHkganVtcCBkb3duIHRyZWVcbiAgICB9XG5cbiAgICB2Tm9kZS5jaGlsZHJlbi5mb3JFYWNoKCBlYWNoQ2hpbGQgKTsgLy8gbG9vcCB0aHJvdWdoIGFsbCB0aGUgY2hpbGRyZW5cbiAgICB2Tm9kZS5fbm9kZSA9IG5vZGU7Ly8gYXR0YWNoIG5vZGUgdG8gdk5vZGVcbn07XG5cbi8qXG4gICAgdnN2Zzo6bW91bnQgLSBtb3VudHMgdG8gYSBhY3R1YWwgZG9tIG5vZGUgYW5kIGFkZHMgY2hpbGRyZW4gIGRvbSBub2RlcyB0byB2aXJ0dWFsIHRyZWVcbiAgICBhcyB3ZWxsLlxuXG4gICAgcGFyYW1zIFxuICAgICAgICBlbCB7IE9iamVjdCB9IC0gYW4gZW50cnkgcG9pbnQgRE9NIG5vZGVcblxuICAgIHJldHVybnNcbiAgICAgICAgZWxlbSB7IE9iamVjdCB9IC0gYSB2aXJ0dWFsIHJlcHJlc2VudGF0aW9uIG9mIHRoZSBET00gbm9kZVxuKi9cblxubWV0aG9kcy5tb3VudCA9IGZ1bmN0aW9uKCBlbCApIHtcbiAgICB2YXIgc3ZnID0gZWwub3V0ZXJIVE1MLFxuICAgICAgICB0YWdUcmVlID0gcGFyc2UoIHN2ZyApO1xuXG4gICAgYWRkTm9kZVRvVk5vZGUoIGVsLCB0YWdUcmVlWyAwIF0gKTsgLy8gc3RhcnQgd2Fsa2luZyB0aGUgcGFyc2VkIHRyZWUgXG4gICAgcmV0dXJuIHRhZ1RyZWVbIDAgXTtcbn07IiwiXG4ndXNlIHN0cmljdCc7XG5cbnZhciB1dGlscyA9IHJlcXVpcmUoICcuL3V0aWxzJyApLFxuICAgIFRleHROb2RlID0gcmVxdWlyZSggJy4vdGV4dE5vZGUnICksXG4gICAgbmFtZXNwYWNlID0gJ2h0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnJztcblxubW9kdWxlLmV4cG9ydHMgPSBTdmdOb2RlO1xuXG4vKlxuICAgIFN2Z05vZGUgLSBjcmVhdGVzIGFuIHN2ZyBub2RlXG4gICAgcGFyYW1zXG4gICAgICAgIHRhZ05hbWUgeyBTdHJpbmcgfSAtIG5hbWUgb2YgdGFnIHRvIGNyZWF0ZVxuICAgICAgICBfYXR0cmlidXRlIHsgT2JqZWN0IH0gLSBhbiBvYmplY3Qgd2l0aCBhdHRyaWJ1dGUgZGVjbGFyYXRpb25zXG4gICAgcmV0dXJuc1xuICAgICAgICB0aGlzIHsgU3ZnTm9kZSBPYmplY3QgfSAtIGFuIG9iamVjdCB3aXRoIGEgbnVtYmVyIG9mIG1ldGhvZHMgdG9cbiAgICAgICAgICAgIG1hbmlwdWxhdGUgZWxlbWVudFxuXG4gICAgVE9ETyBtYWtlIHRvSFRNTCBzZXJ2ZSBiYWNrIHNlbGYgY2xvc2luZyB0YWdzIFxuKi9cblxuZnVuY3Rpb24gU3ZnTm9kZSggdGFnTmFtZSwgYXR0cmlidXRlcywgdm5vZGVzICkge1xuXG4gICAgdmFyIHJlc3QgPSB1dGlscy5tYWtlQXJyYXkoIGFyZ3VtZW50cywgMiApO1xuICAgIGlmICggISggdGhpcyBpbnN0YW5jZW9mIFN2Z05vZGUgKSApIHsgLy8gbWFnaWNhbCBpbnZvY2F0aW9uXG4gICAgICAgIHJldHVybiBuZXcgU3ZnTm9kZSggdGFnTmFtZSwgYXR0cmlidXRlcywgcmVzdCApO1xuICAgIH1cbiAgICBcbiAgICBhdHRyaWJ1dGVzID0gT2JqZWN0LmNyZWF0ZSggYXR0cmlidXRlcyB8fCB7fSApO1xuICAgIHRoaXMuZ3VpZCA9IHV0aWxzLmd1aWQoKTtcbiAgICB0aGlzLnRhZ05hbWUgPSB0YWdOYW1lO1xuICAgIHRoaXMuX2NoaWxkcmVuID0gW107XG4gICAgdGhpcy5zdHlsZXMgPSBhdHRyaWJ1dGVzLnN0eWxlID8gdXRpbHMuc3R5bGVUb09iamVjdCggYXR0cmlidXRlcy5zdHlsZSApIDoge307XG4gICAgYXR0cmlidXRlcy5zdHlsZSA9IHRoaXMuc3R5bGVzO1xuICAgIHRoaXMuX2F0dHJpYnV0ZXMgPSBhdHRyaWJ1dGVzO1xuICAgIGlmICggdHlwZW9mIGRvY3VtZW50ID09PSAnb2JqZWN0JyApIHsgLy8gYXV0byBjcmVhdGUgZWxlbWVudCBpZiBpbiBjbGllbnRcbiAgICAgICAgdGhpcy5fbm9kZSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnROUyggbmFtZXNwYWNlLCB0YWdOYW1lICk7XG4gICAgICAgIGZvciAoIHZhciBhdHRyaWJ1dGUgaW4gYXR0cmlidXRlcyApIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJpYnV0ZXNbIGF0dHJpYnV0ZSBdO1xuXG4gICAgICAgICAgICBpZiAoIGF0dHJpYnV0ZSA9PT0gJ3N0eWxlJyApIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHV0aWxzLm9ialRvU3R5bGVzKCB2YWx1ZSApO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldEF0dHJpYnV0ZSggYXR0cmlidXRlLCB2YWx1ZSApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCBBcnJheS5pc0FycmF5KCB2bm9kZXMgKSAmJiB2bm9kZXMubGVuZ3RoICApIHtcbiAgICAgICAgdm5vZGVzLmZpbHRlciggU3ZnTm9kZS5pc05vZGUgKS5mb3JFYWNoKCB0aGlzLmFwcGVuZENoaWxkLmJpbmQoIHRoaXMgKSApO1xuICAgIH1cbn1cblxuLypcbiAgICBTdmdOb2RlLmlzTm9kZSAtICBjaGVja3MgdG8gc2VlIGlmIG5vZGUgaXMgYSBpbnN0YW5jZSBvZiBTdmdOb2RlXG4gICAgcGFyYW1zXG4gICAgICAgIHZub2RlIHsgTWl4ZWQgfSAtIGEgdmFsdWUgdG8gdGVzdCBhZ2FpbnN0IHRoZSBpbnN0YW5jZSBvZiBTdmdOb2RlXG4gKi9cblxuU3ZnTm9kZS5pc05vZGUgPSBmdW5jdGlvbiggdm5vZGUgKSB7XG4gICAgcmV0dXJuIHZub2RlIGluc3RhbmNlb2YgU3ZnTm9kZTtcbn07XG5cblN2Z05vZGUucHJvdG90eXBlID0ge1xuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6aW5zZXJ0QmVmb3JlIC0gaW5zZXJ0cyBuZXcgY2hpbGQgYmVmb3JlIGEgcmVmZXJhbmNlZCBjaGlsZFxuICAgICAgICBwYXJhbXNcbiAgICAgICAgICAgIGVsZW0geyBTdmdOb2RlIH0gLSBhIG5ldyBlbGVtZW50XG4gICAgICAgICAgICByZWZFbGVtIHsgU3ZnTm9kZSB9IC0gYW4gZXhzaXN0aW5nIGNoaWxkIGVsZW1lbnRcbiAgICAqL1xuXG4gICAgaW5zZXJ0QmVmb3JlOiBmdW5jdGlvbiAoIGVsZW0sIHJlZkVsZW0gKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHV0aWxzLmdldEVsZW1lbnRJbmRleCggcmVmRWxlbSwgdGhpcy5fY2hpbGRyZW4gKTtcbiAgICAgICAgdGhpcy5yZW1vdmVDaGlsZCggZWxlbSApOyAvLyB0aGlzIG5lZWRzIHRvIGJlIHJldmlzZWQgdG8gYmUgbW9yZSBsaWtlIG5vcm1hbCBodG1sIHNwZWNcbiAgICAgICAgdGhpcy5fY2hpbGRyZW4uc3BsaWNlKCBpbmRleCwgMCwgZWxlbSApO1xuICAgICAgICBpZiAoIHRoaXMuX25vZGUgJiYgZWxlbS5fbm9kZSAmJiByZWZFbGVtLl9ub2RlICkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZS5pbnNlcnRCZWZvcmUoIGVsZW0uX25vZGUsIHJlZkVsZW0uX25vZGUgKTtcbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjpyZW1vdmVDaGlsZCAtIHJlbW92ZXMgYSBjaGlsZCBlbGVtZW50IGZyb20gY2hpbGQgYXJyYXlcbiAgICAgICAgcGFyYW1zXG4gICAgICAgICAgICBlbGVtIHsgU3ZnTm9kZSB9IC0gYW4gZXhzaXN0aW5nIGNoaWxkIGVsZW1lbnQgdG8gYmUgcmVtb3ZlZFxuICAgICovXG5cblxuICAgIHJlbW92ZUNoaWxkOiBmdW5jdGlvbiAoIGVsZW0gKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHV0aWxzLmdldEVsZW1lbnRJbmRleCggZWxlbSwgdGhpcy5fY2hpbGRyZW4gKTtcbiAgICAgICAgaWYgKCBpbmRleCA9PT0gLTEgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4uc3BsaWNlKCBpbmRleCwgMSApOyBcbiAgICAgICAgaWYgKCB0aGlzLl9ub2RlICYmIGVsZW0uX25vZGUgKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnJlbW92ZUNoaWxkKCBlbGVtLl9ub2RlICk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6cmVwbGFjZUNoaWxkIC0gcmVtb3ZlcyBhIGNoaWxkIGVsZW1lbnQgZnJvbSBjaGlsZCBhcnJheSBhbmQgYWRkIGEgbmV3IG9uZVxuICAgICAgICBwYXJhbXNcbiAgICAgICAgICAgIGVsZW0geyBTdmdOb2RlIH0gLSBhbiBleHNpc3RpbmcgY2hpbGQgZWxlbWVudCB0byBiZSByZW1vdmVkXG4gICAgICAgICAgICByZXBsYWNlRWxlbSB7IFN2Z05vZGUgfSAtIGFuIGVsZW1lbnQgdG8gcmVwbGFjZSByZW1vdmVkIGVsZW1cbiAgICAqL1xuXG5cbiAgICByZXBsYWNlQ2hpbGQ6IGZ1bmN0aW9uICggZWxlbSwgcmVwbGFjZUVsZW0gKSB7XG4gICAgICAgIHZhciBpbmRleCA9IHV0aWxzLmdldEVsZW1lbnRJbmRleCggZWxlbSwgdGhpcy5fY2hpbGRyZW4gKTtcbiAgICAgICAgaWYgKCBpbmRleCA9PT0gLTEgKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5fY2hpbGRyZW4uc3BsaWNlKCBpbmRleCwgMSwgcmVwbGFjZUVsZW0gKTsgXG4gICAgICAgIGlmICggdGhpcy5fbm9kZSAmJiBlbGVtLl9ub2RlICYmIHJlcGxhY2VFbGVtLl9ub2RlICkge1xuICAgICAgICAgICAgdGhpcy5fbm9kZS5yZXBsYWNlQ2hpbGQoIHJlcGxhY2VFbGVtLl9ub2RlLCBlbGVtLl9ub2RlICk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6YXBwZW5kQ2hpbGQgLSBhcHBlbmRzIGEgY2hpbGQgZWxlbWVudCBmcm9tIGNoaWxkIGFycmF5XG4gICAgICAgIHBhcmFtc1xuICAgICAgICAgICAgZWxlbSB7IFN2Z05vZGUgfSAtIGFuIGV4c2lzdGluZyBjaGlsZCBlbGVtZW50IHRvIGJlIGFwcGVuZGVkXG4gICAgKi9cblxuICAgIGFwcGVuZENoaWxkOiBmdW5jdGlvbiAoIGVsZW0gKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlQ2hpbGQoIGVsZW0gKTsgLy8gcmVtb3ZlIGFueSBvbGQgaW5zdGFuY2VzXG4gICAgICAgIGVsZW0ucGFyZW50Tm9kZSA9IHRoaXM7XG4gICAgICAgIHRoaXMuX2NoaWxkcmVuLnB1c2goIGVsZW0gKTtcbiAgICAgICAgaWYgKCB0aGlzLl9ub2RlICYmIGVsZW0uX25vZGUgKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLmFwcGVuZENoaWxkKCBlbGVtLl9ub2RlICk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6X3JlbW92ZVRleHROb2RlcyAtIGEgdXRpbGl0eSB0byByZW1vdmUgdGV4dCBub2RlcyBmcm9tIGFycmF5XG4gICAgICAgIHBhcmFtc1xuICAgICAgICAgICAgbm9kZSB7IFN2Z05vZGUgfSAtIGEgbm9kZSB0byB0ZXN0IHRvIHNlZSBpZiBpdHMgYSB0ZXh0IG5vZGVcbiAgICAqL1xuXG4gICAgX3JlbW92ZVRleHROb2RlczogZnVuY3Rpb24gKCBub2RlICkge1xuICAgICAgICByZXR1cm4gISFub2RlLnRhZ05hbWU7XG4gICAgfSxcbiAgICBcbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjpjaGlsZHJlbiBbIGdldHRlciBdXG4gICAgICAgIHJldHVybnMgXG4gICAgICAgICAgICBhcnJheSBvZiBub2RlcyB0aGF0IGFyZSBub3QgdGV4dCBub2Rlc1xuICAgICovXG5cbiAgICBnZXQgY2hpbGRyZW4gKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW4uZmlsdGVyKCB0aGlzLl9yZW1vdmVUZXh0Tm9kZXMgKTtcbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6Zmlyc3RDaGlsZCBbIGdldHRlciBdIFxuICAgICAgICByZXR1cm5zIFxuICAgICAgICAgICAgY2hpbGQgeyBTdmdOb2RlIH0gLSBmaXJzdCBjaGlsZCBvciBudWxsXG4gICAgKi9cblxuICAgIGdldCBmaXJzdENoaWxkICggKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlblsgMCBdO1xuICAgIH0sXG5cbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjp0b0hUTUwgLSBjb21waWxlcyB0YWdzIGZvciB0aGUgZWxlbWVudCBhbmQgY2hpbGQgZWxlbWVudHNcbiAgICAgICAgcmV0dXJuc1xuICAgICAgICAgICAgaHRtbCB7IFN0cmluZyB9IC0gdGhlIGh0bWwgKCBzdmcgKSBjb21waWxpZWQgdG8gYSBzdHJpbmcgZm9ybVxuICAgICovXG5cbiAgICB0b0hUTUw6IGZ1bmN0aW9uICggKSB7XG4gICAgICAgIHJldHVybiAnPCcgKyBcbiAgICAgICAgICAgIHRoaXMudGFnTmFtZSArIFxuICAgICAgICAgICAgJyAnICsgXG4gICAgICAgICAgICB1dGlscy5vYmpUb0F0dHJpYnV0ZXMoIHRoaXMuX2F0dHJpYnV0ZXMgfHwge30gKSArIFxuICAgICAgICAgICAgJz4nICsgXG4gICAgICAgICAgICB0aGlzLl9jaGlsZHJlbi5tYXAoIHV0aWxzLm1hcEVsZW1lbnRzVG9IVE1MICkuam9pbignJykgK1xuICAgICAgICAgICAgJzwvJyArXG4gICAgICAgICAgICB0aGlzLnRhZ05hbWUgK1xuICAgICAgICAgICAgJz4nO1xuICAgIH0sXG5cbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjp0b1RleHQgLSBjb21waWxlcyBlbGVtZW50IGlubmVyIHRleHQgbm9kZXMgdG8gc3RyaW5nc1xuICAgICAgICByZXR1cm5zXG4gICAgICAgICAgICB0ZXh0IHsgU3RyaW5nIH0gLSB0aGUgdGV4dCBpbnNpZGUgb2YgZWxlbWVudHNcbiAgICAqL1xuXG4gICAgdG9UZXh0OiBmdW5jdGlvbiggKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9jaGlsZHJlbi5tYXAoIHV0aWxzLm1hcEVsZW1lbnRzVG9UZXh0ICkuam9pbignJyk7XG4gICAgfSxcblxuICAgIC8qXG4gICAgICAgIFN2Z05vZGU6OmdldEF0dHJpYnV0ZSAtIGdldCBhdHRyaWJ1dGUgb2YgZWxlbWVudFxuICAgICAgICBwYXJhbXMgXG4gICAgICAgICAgICBrZXkgeyBTdHJpbmcgfSAtIGF0dHJpYnV0ZSBuYW1lIFxuICAgICAgICByZXR1cm5zXG4gICAgICAgICAgICB2YWx1ZSB7IE1peGVkIH0gLSB0aGUgdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgICovXG5cbiAgICBnZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKCBrZXkgKSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9hdHRyaWJ1dGVzWyBrZXkgXTtcbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6c2V0QXR0cmlidXRlIC0gc2V0IGF0dHJpYnV0ZSBvZiBlbGVtZW50XG4gICAgICAgIHBhcmFtcyBcbiAgICAgICAgICAgIGtleSB7IFN0cmluZyB9IC0gYXR0cmlidXRlIG5hbWUgXG4gICAgICAgICAgICB2YWx1ZSB7IE1peGVkIH0gLSB0aGUgdmFsdWUgb2YgdGhlIGF0dHJpYnV0ZVxuICAgICovXG5cbiAgICBzZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKCBrZXksIHZhbHVlICkge1xuICAgICAgICB0aGlzLl9hdHRyaWJ1dGVzWyBrZXkgXSA9IHZhbHVlO1xuICAgICAgICBpZiAoIHRoaXMuX25vZGUgKSB7XG4gICAgICAgICAgICB0aGlzLl9ub2RlLnNldEF0dHJpYnV0ZSgga2V5LCB2YWx1ZSApO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qXG4gICAgICAgIFN2Z05vZGU6OmF0dHJpYnV0ZXMgWyBnZXR0ZXIgXSAtIHJldHVybnMgdGhlIGFjdHVhbCBhdHRyaWJ1dGUgb2JqZWN0XG4gICAgICAgIHJldHVybnMgXG4gICAgICAgICAgICBhdHRyaWJ1dGVzIHsgT2JqZWN0IH0gLSBvYmplY3Qgb2YgYXR0cmlidXRlcyBrZXkgdmFsdWVzIFxuICAgICovXG5cbiAgICBnZXQgYXR0cmlidXRlcyAoICkge1xuICAgICAgICByZXR1cm4gdGhpcy5fYXR0cmlidXRlcztcbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6YXR0cmlidXRlcyBbIHNldHRlciBdIC0gYmxvY2tzIHRoZSBkaXJlY3Qgc2V0dGluZyBvZiBhdHRyaWJ1dGVzXG4gICAgICAgIHJldHVybnMgXG4gICAgICAgICAgICBhdHRyaWJ1dGVzIHsgTWl4ZWQgfSAtIHZhbHVlIGF0dGVtcHRpbmcgdG8gc2V0IGF0dGlidXRlcyB0byBcbiAgICAqL1xuXG4gICAgc2V0IGF0dHJpYnV0ZXMgKCB2YWx1ZSApIHtcbiAgICAgICAgcmV0dXJuIHZhbHVlOyAvLyBibG9jayBmcm9tIGRpcmVjdGx5IHNldHRpbmdcbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6b3V0ZXJIVE1MIFsgZ2V0dGVyIF0gLSByZXR1cm5zIHNhbWUgYXMgdG9IVE1MKCk7XG4gICAgICAgIHJldHVybnMgXG4gICAgICAgICAgICBodG1sIHsgU3RyaW5nIH0gLSBjb21waWxlZCB2ZXJzaW9uIG9mIGVsZW1lbnQgYW5kIGNoaWxkcmVuXG4gICAgKi9cblxuICAgIGdldCBvdXRlckhUTUwgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b0hUTUwoKTtcbiAgICB9LFxuXG4gICAgLypcbiAgICAgICAgU3ZnTm9kZTo6aW5uZXJIVE1MIFsgZ2V0dGVyIF1cbiAgICAgICAgcmV0dXJucyBcbiAgICAgICAgICAgIGh0bWwgeyBTdHJpbmcgfSAtIGNvbXBpbGVkIHZlcnNpb24gb2YgZWxlbWVudCdzIGNoaWxkcmVuXG4gICAgKi9cblxuICAgIGdldCBpbm5lckhUTUwgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fY2hpbGRyZW4ubWFwKCB1dGlscy5tYXBFbGVtZW50c1RvSFRNTCApLmpvaW4oJycpO1xuICAgIH0sXG5cbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjppbm5lckhUTUwgWyBzZXR0ZXIgXVxuICAgICAgICBwYXJhbXMgXG4gICAgICAgICAgICBodG1sIHsgU3RyaW5nIH0gLSBjb21waWxlZCB2ZXJzaW9uIG9mIGVsZW1lbnQncyBjaGlsZHJlblxuICAgICovXG5cbiAgICBzZXQgIGlubmVySFRNTCAoIGh0bWwgKSB7XG4gICAgICAgIHZhciB2c3ZnID0gcmVxdWlyZSggJy4uLycgKTsgLy8gZGVmZXIgcmVxdWlyZSBzbyBldmVyeXRoaW5nIGlzIGxvYWRlZFxuXG4gICAgICAgIGlmICggdGhpcy5fbm9kZSApIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGUuaW5uZXJIVE1MID0gaHRtbDtcbiAgICAgICAgICAgIHRoaXMuX2NoaWxkcmVuID0gdnN2Zy5tb3VudCggdGhpcy5fbm9kZSApLmNoaWxkcmVuO1xuICAgICAgICB9XG4gICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgdGhpcy5fY2hpbGRyZW4gPSB2c3ZnLnBhcnNlKCBodG1sICk7IFxuICAgICAgICB9XG4gICAgfSxcblxuICAgIC8qXG4gICAgICAgIFN2Z05vZGU6OmlubmVyVGV4dCBbIGdldHRlciBdXG4gICAgICAgIHJldHVybnMgXG4gICAgICAgICAgICBodG1sIHsgU3RyaW5nIH0gLSBjdXJyZW50IGRvZXMgdGhlIGV4YWN0IHNhbWUgdGhpbmcgYXMgaW5uZXJIVE1MXG4gICAgKi9cblxuICAgIGdldCBpbm5lclRleHQgKCkge1xuICAgICAgICByZXR1cm4gdGhpcy50b1RleHQoKTtcbiAgICB9LFxuXG5cbiAgICAvKlxuICAgICAgICBTdmdOb2RlOjppbm5lclRleHQgWyBzZXR0ZXIgXVxuICAgICAgICBwYXJhbXNcbiAgICAgICAgICAgIHZhbHVlIHsgU3RyaW5nIH0gLSBUaGlzIGNyZWF0ZXMgYSB0ZXh0Tm9kZSB3aXRoIHRoZSB0ZXh0IGdpdmVuIGluIGl0LFxuICAgICAgICAgICAgICAgIHdpbGwgYWxzbyByZW1vdmUgYW55IG90aGVyIE5vZGVzIGZyb20gY3VycmVudCBlbGVtZW50XG4gICAgKi9cblxuICAgIHNldCBpbm5lclRleHQgKCB2YWx1ZSApIHtcbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ubGVuZ3RoID0gMDsgLy8gZW1wdHkgYXJyYXlcbiAgICAgICAgdGhpcy5fY2hpbGRyZW4ucHVzaCggbmV3IFRleHROb2RlKCB2YWx1ZSwge1xuICAgICAgICAgICAgdW5zYWZlOiB0aGlzLnRhZ05hbWUgPT09ICdzdHlsZScgXG4gICAgICAgIH0gKSApOyAvLyBzdHlsZSB0YWdzIG5lZWQgbm8gZXNjYXBlXG4gICAgICAgIGlmICggdGhpcy5fbm9kZSApIHtcbiAgICAgICAgICAgIHRoaXMuX25vZGUuaW5uZXJUZXh0ID0gdmFsdWU7XG4gICAgICAgIH1cbiAgICB9XG59OyIsIlxuJ3VzZSBzdHJpY3QnO1xuXG4vKlxuICAgIEFsbCBjdXJyZW50IHN2ZyB0YWdzXG4qL1xuXG5tb2R1bGUuZXhwb3J0cyA9IFtcbiAgICBcImFcIixcbiAgICBcImFsdEdseXBoXCIsXG4gICAgXCJhbHRHbHlwaERlZlwiLFxuICAgIFwiYWx0R2x5cGhJdGVtXCIsXG4gICAgXCJhbmltYXRlXCIsXG4gICAgXCJhbmltYXRlQ29sb3JcIixcbiAgICBcImFuaW1hdGVNb3Rpb25cIixcbiAgICBcImFuaW1hdGVUcmFuc2Zvcm1cIixcbiAgICBcImNpcmNsZVwiLFxuICAgIFwiY2xpcFBhdGhcIixcbiAgICBcImNvbG9yLXByb2ZpbGVcIixcbiAgICBcImN1cnNvclwiLFxuICAgIFwiZGVmc1wiLFxuICAgIFwiZGVzY1wiLFxuICAgIFwiZWxsaXBzZVwiLFxuICAgIFwiZmVCbGVuZFwiLFxuICAgIFwiZmVDb2xvck1hdHJpeFwiLFxuICAgIFwiZmVDb21wb25lbnRUcmFuc2ZlclwiLFxuICAgIFwiZmVDb21wb3NpdGVcIixcbiAgICBcImZlQ29udm9sdmVNYXRyaXhcIixcbiAgICBcImZlRGlmZnVzZUxpZ2h0aW5nXCIsXG4gICAgXCJmZURpc3BsYWNlbWVudE1hcFwiLFxuICAgIFwiZmVEaXN0YW50TGlnaHRcIixcbiAgICBcImZlRmxvb2RcIixcbiAgICBcImZlRnVuY0FcIixcbiAgICBcImZlRnVuY0JcIixcbiAgICBcImZlRnVuY0dcIixcbiAgICBcImZlRnVuY1JcIixcbiAgICBcImZlR2F1c3NpYW5CbHVyXCIsXG4gICAgXCJmZUltYWdlXCIsXG4gICAgXCJmZU1lcmdlXCIsXG4gICAgXCJmZU1lcmdlTm9kZVwiLFxuICAgIFwiZmVNb3JwaG9sb2d5XCIsXG4gICAgXCJmZU9mZnNldFwiLFxuICAgIFwiZmVQb2ludExpZ2h0XCIsXG4gICAgXCJmZVNwZWN1bGFyTGlnaHRpbmdcIixcbiAgICBcImZlU3BvdExpZ2h0XCIsXG4gICAgXCJmZVRpbGVcIixcbiAgICBcImZlVHVyYnVsZW5jZVwiLFxuICAgIFwiZmlsdGVyXCIsXG4gICAgXCJmb250XCIsXG4gICAgXCJmb250LWZhY2VcIixcbiAgICBcImZvbnQtZmFjZS1mb3JtYXRcIixcbiAgICBcImZvbnQtZmFjZS1uYW1lXCIsXG4gICAgXCJmb250LWZhY2Utc3JjXCIsXG4gICAgXCJmb250LWZhY2UtdXJpXCIsXG4gICAgXCJmb3JlaWduT2JqZWN0XCIsXG4gICAgXCJnXCIsXG4gICAgXCJnbHlwaFwiLFxuICAgIFwiZ2x5cGhSZWZcIixcbiAgICBcImhrZXJuXCIsXG4gICAgXCJpbWFnZVwiLFxuICAgIFwibGluZVwiLFxuICAgIFwibGluZWFyR3JhZGllbnRcIixcbiAgICBcIm1hcmtlclwiLFxuICAgIFwibWFza1wiLFxuICAgIFwibWV0YWRhdGFcIixcbiAgICBcIm1pc3NpbmctZ2x5cGhcIixcbiAgICBcIm1wYXRoXCIsXG4gICAgXCJwYXRoXCIsXG4gICAgXCJwYXR0ZXJuXCIsXG4gICAgXCJwb2x5Z29uXCIsXG4gICAgXCJwb2x5bGluZVwiLFxuICAgIFwicmFkaWFsR3JhZGllbnRcIixcbiAgICBcInJlY3RcIixcbiAgICBcInNjcmlwdFwiLFxuICAgIFwic2V0XCIsXG4gICAgXCJzdG9wXCIsXG4gICAgXCJzdHlsZVwiLFxuICAgIFwic3ZnXCIsXG4gICAgXCJzcGFuXCIsXG4gICAgXCJzd2l0Y2hcIixcbiAgICBcInN5bWJvbFwiLFxuICAgIFwidGV4dFwiLFxuICAgIFwidGV4dFBhdGhcIixcbiAgICBcInRpdGxlXCIsXG4gICAgXCJ0cmVmXCIsXG4gICAgXCJ0c3BhblwiLFxuICAgIFwidXNlXCIsXG4gICAgXCJ2aWV3XCIsXG4gICAgXCJ2a2VyblwiXG5dOyIsIlxuJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbHMgPSByZXF1aXJlKCAnLi91dGlscycgKTtcblxubW9kdWxlLmV4cG9ydHMgPSBUZXh0Tm9kZTtcblxuZnVuY3Rpb24gVGV4dE5vZGUgKCB0ZXh0LCBvcHRpb25zICkge1xuICAgIGlmICggISggdGhpcyBpbnN0YW5jZW9mIFRleHROb2RlICkgKSB7IC8vIG1hZ2ljYWwgaW52b2NhdGlvblxuICAgICAgICByZXR1cm4gbmV3IFRleHROb2RlKCB0ZXh0LCBvcHRpb25zICk7XG4gICAgfVxuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9O1xuICAgIHRoaXMudGV4dCA9IG9wdGlvbnMudW5zYWZlID8gdGV4dCA6IHV0aWxzLmVzY2FwZUhUTUwoIHRleHQgKTtcbn1cblxuVGV4dE5vZGUucHJvdG90eXBlID0ge1xuICAgIHRvSFRNTDogZnVuY3Rpb24oICkge1xuICAgICAgICByZXR1cm4gdGhpcy50ZXh0O1xuICAgIH0sXG4gICAgdG9UZXh0OiBmdW5jdGlvbiggKSB7XG4gICAgICAgIHJldHVybiB0aGlzLnRleHQ7XG4gICAgfVxufTsiLCJcbid1c2Ugc3RyaWN0JztcblxuLypcbiAgICBzNCAmIGd1aWQgLSBtYWtlcyBhIHVuaXF1ZSBpZGVuaWZpZXIgZm9yIGVsZW1lbnRzXG4qL1xuZnVuY3Rpb24gczQoICkge1xuICAgIHJldHVybiBNYXRoLmZsb29yKCAoIDEgKyBNYXRoLnJhbmRvbSggKSApICogMHgxMDAwMCApXG4gICAgICAgIC50b1N0cmluZyggMTYgKVxuICAgICAgICAuc3Vic3RyaW5nKCAxICk7XG59XG5cblxuZXhwb3J0cy5ndWlkID0gZnVuY3Rpb24gZ3VpZCggKSB7XG4gICAgcmV0dXJuIHM0KCApICsgczQoICkgKyAnLScgKyBzNCggKSArICctJyArIHM0KCApICsgJy0nICtcbiAgICAgICAgczQoICkgKyAnLScgKyBzNCggKSArIHM0KCApICsgczQoICk7XG59O1xuXG4vKlxuICAgIG9ialRvU3R5bGUgLSBjb21waWxlcyB7IGtleTogdmFsdWUgfSB0byBrZXk6dmFsdWU7XG4gICAgcGFyYW1zXG4gICAgICAgIHN0eWxlcyB7IE9iamVjdCB9IC0gb2JqZWN0IG9mIHN0eWxlIGRlY2xhcmF0aW9uc1xuICAgIHJldHJ1bnNcbiAgICAgICAgcmV0IHsgU3RyaW5nIH0gLSBjb21waWxlZCBzdGluZyB3aXRoIGNzcyBkZWNsYXJhdGlvbnMgXG5cbiAgICBUT0RPIC0gc3VwcG9ydCBjYW1lbCBjYXNlXG4qL1xuXG52YXIgb2JqVG9TdHlsZXMgPVxuZXhwb3J0cy5vYmpUb1N0eWxlcyA9IGZ1bmN0aW9uIG9ialRvU3R5bGVzKCBzdHlsZXMgKSB7XG4gICAgdmFyIHJldCA9ICcnO1xuICAgIGZvciAoIHZhciBwcm9wIGluIHN0eWxlcyApIHtcbiAgICAgICAgcmV0ICs9IHByb3AgKyAnOicgKyBzdHlsZXNbIHByb3AgXSArICc7JztcbiAgICB9XG4gICAgcmV0dXJuIHJldDtcbn07XG5cbi8qXG4gICAgc3R5bGVUb09iamVjdCAtIGRlY29tcGlsaWVzIGtleTp2YWx1ZSB0byB7IGtleTogdmFsdWUgfTtcbiAgICBwYXJhbXNcbiAgICAgICAgc3R5bGVzIHsgU3RyaW5nIH0gLSBjb21waWxlZCBzdGluZyB3aXRoIGNzcyBkZWNsYXJhdGlvbnNcbiAgICByZXRydW5zXG4gICAgICAgIHJldCB7IE9iamVjdCB9IC0gb2JqZWN0IG9mIHN0eWxlIGRlY2xhcmF0aW9uc1xuKi9cblxuZXhwb3J0cy5zdHlsZVRvT2JqZWN0ID0gZnVuY3Rpb24gc3R5bGVUb09iamVjdCggc3R5bGVzICkge1xuICAgIHZhciByZXQgPSB7IH07XG5cbiAgICBpZiAoIHR5cGVvZiBzdHlsZXMgPT09ICdvYmplY3QnICkge1xuICAgICAgICByZXR1cm4gc3R5bGVzO1xuICAgIH1cblxuICAgIHN0eWxlcy5zcGxpdCggJzsnICkubWFwKCBrZXlWYWwgKS5mb3JFYWNoKCBhZGRUb1JldHVybiApO1xuXG4gICAgZnVuY3Rpb24gYWRkVG9SZXR1cm4gKCBrZXl2YWwgKSB7XG4gICAgICAgIHJldFsga2V5dmFsWyAwIF0gXSA9IGtleXZhbFsgMSBdO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGtleVZhbCggc3RyICkge1xuICAgICAgICByZXR1cm4gc3RyLnRyaW0oKS5zcGxpdCggJzonICk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKlxuICAgIG9ialRvQXR0cmlidXRlIC0gY29tcGlsZXMgeyBrZXk6IHZhbHVlIH0gdG8ga2V5PVwidmFsdWVcIlxuICAgIHBhcmFtc1xuICAgICAgICBhdHRyaWJ1dGVzIHsgT2JqZWN0IH0gLSBvYmplY3Qgb2YgYXR0cmlidXRlIGRlY2xhcmF0aW9uc1xuICAgICAgICAgICAgc3R5bGUgb2JqZWN0cyB3aWxsIHJ1biB0aHJvdWdoIG9ialRvU3R5bGVzXG4gICAgcmV0dXJuc1xuICAgICAgICByZXQgeyBTdHJpbmcgfSAtIGNvbXBpbGVkIHN0cmluZyB3aXRoIGF0dHJpYnV0ZSBkZWNsYXJhdGlvbiBcblxuICAgIFRPRE8gLSBzdXBwb3J0IGNhbWVsIGNhc2VcbiovXG5cbmV4cG9ydHMub2JqVG9BdHRyaWJ1dGVzID0gZnVuY3Rpb24gb2JqVG9BdHRyaWJ1dGVzKCBhdHRyaWJ1dGVzICkge1xuICAgIHZhciByZXQgPSAnJyxcbiAgICAgICAgdmFsdWU7XG4gICAgZm9yKCB2YXIgYXR0ciBpbiBhdHRyaWJ1dGVzICkge1xuICAgICAgICB2YWx1ZSA9IGF0dHIgPT09ICdzdHlsZScgPyBvYmpUb1N0eWxlcyggYXR0cmlidXRlc1sgYXR0ciBdICkgOiBhdHRyaWJ1dGVzWyBhdHRyIF07XG4gICAgICAgIGlmICggYXR0ciAhPT0gJ3N0eWxlJyB8fCB2YWx1ZSApIHtcbiAgICAgICAgICAgIHJldCArPSBhdHRyICsgJz1cIicgKyB2YWx1ZSArICdcIiAnO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG59O1xuXG4vKlxuICAgIG1hcEVsZW1lbnRzVG9IVE1MIC0gdG8gYmUgdXNlIHdpdGggYXJyLm1hcCB3aXRoIHJ1biB0b0hUTUwgb2YgZWFjaCBlbGVtZW50XG4gICAgcGFyYW1zXG4gICAgICAgIGVsZW0geyBTdmdOb2RlIE9iamVjdCB9IC0gb2JqZWN0IGNyZWF0ZWQgYnkgY2FsbGluZyB0YWcoKS5cbiAgICByZXR1cm5zXG4gICAgICAgIGh0bWwgeyBTdHJpbmcgfSAtIGNvbXBpbGVkIGVsZW0gb2JqZWN0XG4qL1xuXG5leHBvcnRzLm1hcEVsZW1lbnRzVG9IVE1MID0gZnVuY3Rpb24gbWFwRWxlbWVudHNUb0hUTUwoIGVsZW0gKSB7XG4gICAgcmV0dXJuIGVsZW0udG9IVE1MKCk7XG59O1xuXG4vKlxuICAgIG1hcEVsZW1lbnRzVG9IVE1MIC0gdG8gYmUgdXNlIHdpdGggYXJyLm1hcCB3aXRoIHJ1biB0b0hUTUwgb2YgZWFjaCBlbGVtZW50XG4gICAgcGFyYW1zXG4gICAgICAgIGVsZW0geyBTdmdOb2RlIE9iamVjdCB9IC0gb2JqZWN0IGNyZWF0ZWQgYnkgY2FsbGluZyB0YWcoKS5cbiAgICByZXR1cm5zXG4gICAgICAgIGh0bWwgeyBTdHJpbmcgfSAtIGNvbXBpbGVkIGVsZW0gb2JqZWN0XG4qL1xuXG5leHBvcnRzLm1hcEVsZW1lbnRzVG9UZXh0ID0gZnVuY3Rpb24gbWFwRWxlbWVudHNUb1RleHQoIGVsZW0gKSB7XG4gICAgcmV0dXJuIGVsZW0udG9UZXh0KCk7XG59O1xuXG4vKlxuICAgIGdldEVsZW1lbnRJbmRleCAtIGdldCB0aGUgaW5kZXggb2YgdGhlIGVsZW1lbnQgaW4gYW4gYXJyYXlcbiAgICBwYXJhbXNcbiAgICAgICAgZWxlbSB7IFN2Z05vZGUgT2JqZWN0IH0gLSBvYmplY3QgY3JlYXRlZCBieSBjYWxsaW5nIHRhZygpLlxuICAgICAgICBhcnIgeyBBcnJheSB9IC0gYSBjb2xsZWN0aW9ucyBvZiBTdmdOb2RlIE9iamVjdHNcbiAgICByZXR1cm5zXG4gICAgICAgIGluZGV4IHsgTnVtYmVyIH0gLSB0aGUgaW5kZXggb2YgU3ZnTm9kZSBvYmogaW4gY29sbGVjdGlvblxuKi9cblxuZXhwb3J0cy5nZXRFbGVtZW50SW5kZXggPSBmdW5jdGlvbiBnZXRFbGVtZW50SW5kZXgoIGVsZW0sIGFyciApIHtcbiAgICB2YXIgaW5kZXggPSAtMTtcbiAgICBhcnIuZm9yRWFjaCggZnVuY3Rpb24oIF9lbGVtLCBfaW5kZXggKSB7XG4gICAgICAgIGlmICggZWxlbS5ndWlkID09PSBfZWxlbS5ndWlkICkge1xuICAgICAgICAgICAgaW5kZXggPSBfaW5kZXg7XG4gICAgICAgIH1cbiAgICB9ICk7XG4gICAgcmV0dXJuIGluZGV4O1xufTtcblxuLypcbiAgICBlc2NhcGVIVE1MIC0gZXNjYXBlcyBIVE1MXG4gICAgcGFyYW1zXG4gICAgICAgIGh0bWwgeyBTdHJpbmcgfSAtIHVuZXNjYXBlZCBodG1sXG4gICAgcmV0dXJuc1xuICAgICAgICB0ZXh0IHsgU3RyaW5nIH0gLSBlc2NhcGVkIGh0bWxcbiovXG5cbmV4cG9ydHMuZXNjYXBlSFRNTCA9IGZ1bmN0aW9uIGVzY2FwZUhUTUwoIGh0bWwgKSB7XG4gIHJldHVybiBTdHJpbmcoIGh0bWwgKVxuICAgIC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuICAgIC5yZXBsYWNlKC8nL2csICcmIzM5OycpXG4gICAgLnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuICAgIC5yZXBsYWNlKC8+L2csICcmZ3Q7Jyk7XG59O1xuXG4vKlxuICAgIG1ha2VBcnJheSAtIGNyZWF0ZXMgYSBjb3B5IG9mIGFuIGFycmF5XG4gICAgcGFyYW1zXG4gICAgICAgIGFyciB7IEFycmF5IH0gLSBvcmlnaW5hbCBhcnJheVxuICAgIHJldHVybnNcbiAgICAgICAgYXJyIHsgQXJyYXkgfSAtIG5ldyBBcnJheVxuKi9cblxuZXhwb3J0cy5tYWtlQXJyYXkgPSBmdW5jdGlvbiBtYWtlQXJyYXkoIGFyciwgaW5kZXggKSB7XG4gICAgcmV0dXJuIEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKCBhcnIsIGluZGV4IHx8IDAgKTtcbn07XG4iLCJcbm1vZHVsZS5leHBvcnRzLmVuY29kZSA9IHJlcXVpcmUoICcuL3NyYy9lbmNvZGUnICkuZW5jb2RlO1xuIiwiXG4vLyBleHBvcnQgb3V0IHNyYyBzdmdcbnZhciB2c3ZnID0gcmVxdWlyZSggJy4vc3JjLycgKTtcblxubW9kdWxlLmV4cG9ydHMgPSB2c3ZnO1xuXG5pZiAoIHR5cGVvZiB3aW5kb3cgPT09ICdvYmplY3QnICkge1xuICAgIHdpbmRvdy52c3ZnID0gdnN2Zztcbn0iXX0=
