/* jslint maxstatements: false */
/*
  Oculus.js
  -------
  Bridging the gap between Adaptive and Desktop.

*/
 define([
    '$'
],
function($) {
    function Oculus() {
        this.handlers = [];
        this.defaultHandler = null;
    }

    Oculus.prototype.setDefaultHandler = function(name) {
        this.defaultHandler = name;
    };

    Oculus.prototype.init = function() {
        var oculus = this;

        this.addHandler('visibility', function($ours, $theirs) {
            $ours.css('display', $theirs.css('display'));
        });

        this.addHandler('click', function($ours, $theirs) {
            var onClick = function(e) {
                var event = new MouseEvent('click');

                // initMouseEvent(type, canBubble, cancelable, view, clickCount, 
                //                screenX, screenY, clientX, clientY, 
                //                ctrlKey, altKey, shiftKey, metaKey, 
                //                button, relatedTarget);
                event.initMouseEvent('click', e.bubbles, e.cancelable, e.view, null,
                    e.x, e.y, e.clientX, e.clientY,
                    e.metaKey, e.altKey, e.shiftKey, e.metaKey,
                    e.button, e.relatedTarget
                );

                var overrideFuncs = ['preventDefault', 'stopPropagation', 'stopImmediatePropagation'];

                $.each(overrideFuncs, function(i, funcName) {
                    var originalFunc = event[funcName];

                    event[funcName] = function() {
                        e[funcName]();
                        return originalFunc.apply(this, arguments);
                    };
                });

                var result = $theirs.trigger(event);

                return result;
            };

            $ours.on('click', onClick);
        });

        this.addHandler('text', function($ours, $theirs) {
            var update = function() {
                $ours.text($theirs.text());
            };

            var observer = new MutationObserver(function() {
                // We don't really care what mutation happened, we just want to sync everything incase
                update();
            });

            observer.observe($theirs[0], { attributes: true, childList: true, characterData: true, subtree: false });

            update();
        });

        this.addHandler('value', function($ours, $theirs) {
            var theirValue;
            var change = false;

            var onOurInputChange = function() {
                // Check for duplicate changes
                if (change) {
                    change = false;
                    return;
                }

                // Probably only need to set the value property, but we
                // also set the attribute to be safe
                $theirs.val($ours.val());

                change = true;

                $theirs.trigger('change');
            };

            var onOurSelectChange = function() {
                // Check for duplicate changes
                if (change) {
                    change = false;
                    return;
                }

                // Select chosen option in the linked element
                $theirs
                    .prop('selectedIndex', $ours.prop('selectedIndex'));

                change = true;
                
                $theirs.trigger('change');
            };

            var onTheirInputChange = function() {
                // Check for duplicate changes
                if (change) {
                    change = false;
                    return;
                }

                theirValue = $theirs.val();

                // We don't really care what mutation happened, we just want to sync everything incase
                $ours.val(theirValue);

                change = true;

                $ours.trigger('change');
            };

            var onTheirSelectChange = function() {
                // Check for duplicate changes
                if (change) {
                    change = false;
                    return;
                }

                // Select chosen option in our element
                $ours
                    .prop('selectedIndex', $theirs.prop('selectedIndex'));

                change = true;
                
                $ours.trigger('change');
            };

            var detectTheirInputChange = function() {
                if ($theirs.val() !== theirValue) {
                    onTheirInputChange();
                }

                setTimeout(detectTheirInputChange, 50);
            };

            if ($ours.is('input')) {
                $ours.on('change keyup', onOurInputChange);

                // Mutation Observers can't detect value changes
                // http://stackoverflow.com/questions/12048645/how-do-you-get-a-mutation-observer-to-detect-a-value-change-of-a-textarea
                detectTheirInputChange();
            }
            else if ($ours.is('select')) {
                $ours.on('change', onOurSelectChange);
                $theirs.on('change', onTheirSelectChange);
            }
        });

        this.addHandler('state', function($ours, $theirs) {
            var update = function() {
                $ours.prop('disabled', $theirs.prop('disabled'));
                $ours.prop('selected', $theirs.prop('selected'));
                $ours.prop('checked', $theirs.prop('checked'));
                $ours.prop('readonly', $theirs.prop('readonly'));

                $ours[0].checked = $theirs[0].checked;
            };

            var observer = new MutationObserver(function() {
                // We don't really care what mutation happened, we just want to sync everything incase
                update();
            });

            observer.observe($theirs[0], { attributes: true, childList: false, characterData: false, subtree: false });

            update();
        });

        this.addHandler('html', function($ours, $theirs) {
            var ourHTML = $ours.html();

            var update = function() {
                var theirHTML = $theirs.html();

                if (theirHTML !== ourHTML) {
                    $ours.html(theirHTML);

                    ourHTML = theirHTML;
                }

                setTimeout(update, 500);
            };

            update();
        });

        this.addHandler('options', function($ours, $theirs) {
            $ours.html($theirs.html());
        });

        this.setDefaultHandler('click');

        // Initialize handlers on elements
        $('[data-oculus-element]').each(function() {
            var $self = $(this);
            var handlers = $self.attr('data-oculus-handlers');
            var element = $self.attr('data-oculus-element');
            var $linked = element;

            // Assign linked element to the result of the selector
            if (typeof element === 'string') {
                $linked = $(element);
            }

            if (!$linked.length) {
                return;
            }

            if (handlers) {
                handlers = handlers.split(' ');

                for (var i = 0, l = handlers.length; i < l; ++i) {
                    var eventName = handlers[i];

                    oculus.setupHandler(eventName, $self, $linked);
                }
            }
            else if (oculus.defaultHandler) {
                // SELECT and INPUT elements 
                if ($self.is('select') || $self.is('input')) {
                    oculus.setupHandler('value', $self, $linked);
                }
                else {

                    oculus.setupHandler(oculus.defaultHandler, $self, $linked);
                }
            }
        });

    };

    Oculus.prototype.addHandler = function(name, handler) {
        this.handlers[name] = handler;
    };

    Oculus.prototype.setupHandler = function(name, $ours, $theirs) {
        if (!this.handlers.hasOwnProperty(name)) {
            console.error("Handler with name '" + name + "' not found", $ours);
            return;
        }

        this.handlers[name]($ours, $theirs);
    };

    return Oculus;
});