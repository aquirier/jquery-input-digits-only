/*
* jQuery Input Digits Only Plugin
* Version: 1.0.0.
* Release Date: 2012-12-29.
* Copyright 2012, Aleksey Kislitsyn, Quantum Art, S-Pb.
*/

(function ($) {
    $.fn.digitsOnly = function (method) {

        if (!(this instanceof $) ||
            (this.get(0) == null) || (typeof (this.get(0)) != 'object') ||
            (this.get(0).tagName == null) || (typeof (this.get(0)).tagName == 'undefined') ||
            this.get(0).tagName.toLowerCase() !== 'input' ||
            this.get(0).type.toLowerCase() !== 'text')
            return;

        var _self = $(this.get(0));
        var _maxLength = 0;
        var _regexpToCheckValue = null;
        var _isFocusEventFired = false;
        var _beforeFocusVal = null;
        var _beforePasteVal = null;
        var _beforePasteSelectionIndexes = {
            start: 0,
            end: 0
        };

        var _allowedKeyCodes = [
            8,//BackSpace
            9,//Tab
            35,//End
            36,//Home
            37,//Left
            39,//Right
            46//Delete
        ];

        var _pasteModes = {
            maximum: 'maximum',
            toMaxLength: 'toMaxLength'
        };

        var _fn = {
            parseCurrentValToNumber: function (applySplitSpaces) {
                var currentVal = $.trim(_self.val());
                if (applySplitSpaces === true)
                    currentVal = currentVal.replace(/ /g, '');

                return _fn.fixValueWithRegExp(currentVal);
            },

            fixValueWithRegExp: function (value) {
                var matches = value.match(_regexpToCheckValue);

                return matches[1] ? matches[1] : '';
            },

            getInputContentSelection: function () {
                var input = _self.get(0);
                if (input.setSelectionRange)
                    return input.value.substr(input.selectionStart, (input.selectionEnd - input.selectionStart));
                else if (document.selection && document.selection.createRange)
                    return document.selection.createRange().text;
            },


            hasInputContentSelection: function () {
                return (_fn.getInputContentSelection().length > 0);
            },


            setInputContentSelection: function () {
                var input = _self.get(0);
                if (input.setSelectionRange) {
                    input.selectionStart = 0;
                    input.selectionEnd = input.value.length;
                }
                else if (input.createTextRange) {
                    var inputRange = input.createTextRange();
                    inputRange.moveStart('character', 0);
                    inputRange.collapse();
                    inputRange.moveEnd('character', input.value.length);
                    inputRange.select();
                }
            },


            saveBeforePasteSelectionIndexes: function () {
                var input = _self.get(0);
                if (input.setSelectionRange) {
                    _beforePasteSelectionIndexes.start = input.selectionStart;
                    _beforePasteSelectionIndexes.end = input.selectionEnd;
                }
                else if (document.selection && document.selection.createRange) {
                    var range = document.selection.createRange();
                    var initialSelectionLength = range.text.length;
                    range.moveStart('character', -input.value.length);
                    _beforePasteSelectionIndexes.start = range.text.length - initialSelectionLength;
                    _beforePasteSelectionIndexes.end = range.text.length;
                }
            },

            restoreBeforePasteSelection: function () {
                var input = _self.get(0);
                if (input.setSelectionRange) {
                    input.selectionStart = _beforePasteSelectionIndexes.start;
                    input.selectionEnd = _beforePasteSelectionIndexes.end;
                }
                else if (input.createTextRange) {
                    var inputRange = input.createTextRange();
                    inputRange.moveStart('character', _beforePasteSelectionIndexes.start);
                    inputRange.collapse();
                    inputRange.moveEnd('character', _beforePasteSelectionIndexes.end - _beforePasteSelectionIndexes.start);
                    inputRange.select();
                }
            },

            processAfterPasteVal: function (pasteMode) {
                if (pasteMode != _pasteModes.maximum && pasteMode != _pasteModes.toMaxLength) {
                    _fn.restoreBeforePasteSelection();
                    return;
                }

                var afterPasteVal = _self.val();

                var valStartPart = _beforePasteVal.substr(0, _beforePasteSelectionIndexes.start);
                var valTail = _beforePasteVal.substr(_beforePasteSelectionIndexes.end);

                var clipboardVal = '';
                if (valTail.length > 0) {
                    var valTailIndex = afterPasteVal.lastIndexOf(valTail);
                    clipboardVal = afterPasteVal.substr(_beforePasteSelectionIndexes.start, valTailIndex - _beforePasteSelectionIndexes.start);
                }
                else
                    clipboardVal = afterPasteVal.substr(_beforePasteSelectionIndexes.start);

                clipboardVal = _fn.fixValueWithRegExp($.trim(clipboardVal));

                var allowedClipboardSymbolsCount = (pasteMode == _pasteModes.maximum) ?
                    (_maxLength - valStartPart.length) :
                    (_maxLength - (valStartPart.length + valTail.length));

                clipboardVal = (allowedClipboardSymbolsCount <= 0) ? '' : clipboardVal.substr(0, allowedClipboardSymbolsCount);

                var resultVal = valStartPart + clipboardVal + valTail;
                resultVal = resultVal.substr(0, _maxLength);

                _self.val(resultVal);

                _beforePasteSelectionIndexes.start += clipboardVal.length;
                _beforePasteSelectionIndexes.end = _beforePasteSelectionIndexes.start;
                _fn.restoreBeforePasteSelection();
            }
        };

        var methods = {
            init: function (options) {
                if (options.maxLength == null)
                    return;

                _maxLength = parseInt(options.maxLength);
                if (isNaN(_maxLength) || _maxLength < 1)
                    return;

                _regexpToCheckValue = new RegExp("^(\\d{1," + _maxLength + '})?.*');

                _self.focus(function () {
                    _isFocusEventFired = true;
                    _beforeFocusVal = $.trim(_self.val());
                    _self.val(_fn.parseCurrentValToNumber(options.applySplitSpaces));
                });


                _self.blur(function () {
                    var newVal = $.trim(_self.val());

                    //Removing extra zeros
                    while (newVal.length > 0 && newVal.charAt(0) === '0' && newVal !== '0')
                        newVal = newVal.substr(1);

                    //Processing empty result value
                    if (newVal == '') {
                        _self.val(_beforeFocusVal);
                        return;
                    }

                    var outputVal = newVal.substr(0, _maxLength);//maxlength additional protection

                    _self.val((options.applySplitSpaces === true) ? methods.applySplitSpaces(outputVal) : outputVal);

                    if (options.callback && typeof (options.callback) === 'function')
                        options.callback(outputVal, _self);
                });


                _self.keydown(function (e) {
                    //Skipping allowed keycodes
                    for (var i = 0; i < _allowedKeyCodes.length; i++) {
                        if (_allowedKeyCodes[i] == e.which)
                            return true;
                    }

                    //Processing max length
                    var currentVal = _self.val();
                    if (currentVal.length > _maxLength) {
                        currentVal = currentVal.substr(0, _maxLength);
                        _self.val(currentVal);
                    }

                    //Accept typing digits
                    if ((e.which >= 48 && e.which <= 57) || (e.which >= 96 && e.which <= 105)) {
                        //Denying Shift key with digits
                        if (e.shiftKey)
                            return false;

                        //Checking current selection range
                        if (_fn.hasInputContentSelection())
                            return true;
                        else
                            return (currentVal.length < _maxLength);
                    }

                    //Allowing (Ctrl + A,C,V,X)
                    if (e.ctrlKey && (e.which == 65 || e.which == 67 || e.which == 86 || e.which == 88))
                        return true;

                    return false;
                });


                _self.mouseup(function (e) {
                    if (_isFocusEventFired && (options.selectValueOnFocus === true)) {
                        _isFocusEventFired = false;
                        _fn.setInputContentSelection();
                    }
                });


                //Denying drag-and-drop
                _self.bind('drop dragover', function (e) {
                    e.preventDefault();
                });


                //Processing paste event
                _self.bind('paste', function (e) {
                    _beforePasteVal = _self.val();
                    _fn.saveBeforePasteSelectionIndexes();
                    setTimeout(function () { _fn.processAfterPasteVal(options.pasteMode); }, 0);

                    return (options.pasteMode == _pasteModes.maximum || options.pasteMode == _pasteModes.toMaxLength);
                });

                //Fixing initial input value
                var initialValFixed = _fn.parseCurrentValToNumber(options.applySplitSpaces);
                if ((options.applySplitSpaces === true) && (initialValFixed.length > 0))
                    _self.val(methods.applySplitSpaces(initialValFixed));
                else
                    _self.val(initialValFixed);

                if ((options.executeCallbackOnInit === true) && (initialValFixed.length > 0) && options.callback && (typeof (options.callback) === 'function'))
                    options.callback(initialValFixed, _self);
            },

            applySplitSpaces: function (value) {
                var SPLIT_PORTION_LENGTH = 3;
                var SPACE = ' ';

                var valueParts = [];
                value = value.toString();
                var partsCount = parseInt(value.length / SPLIT_PORTION_LENGTH);
                for (var i = 1; i <= partsCount; i++)
                    valueParts.push(SPACE + value.substr(value.length - i * SPLIT_PORTION_LENGTH, SPLIT_PORTION_LENGTH));

                if (value.length > partsCount * SPLIT_PORTION_LENGTH)
                    valueParts.push(SPACE + value.substr(0, value.length - partsCount * SPLIT_PORTION_LENGTH));

                valueParts.reverse();

                var emptyStr = '';
                var result = emptyStr.concat.apply(emptyStr, valueParts);

                return result.substr(1);
            }
        };

        if (typeof (method) === 'object' || !method)
            return methods.init.apply(this, arguments);
        else if (methods[method])
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    };
})(jQuery);