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
            $ours.text($theirs.text());
        });

        this.addHandler('value', function($ours, $theirs) {
            $ours.val($theirs.val());

            $theirs.on('change', function() {
                if ($theirs.val() !== $ours.val()) {
                    $ours.val($theirs.val());
                }
            });

            var onInputKeyUp = function() {
                $theirs.val($ours.val());
            };

            $ours.on('keyup change', onInputKeyUp);
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
            $ours.html($theirs.html());
        });

        this.addHandler('change', function($ours, $theirs) {
            var onInputChange = function() {
                // Probably only need to set the value property, but we
                // also set the attribute to be safe
                $theirs.val($ours.val());

                $theirs.trigger('change');
            };

            var onSelectChange = function() {
                // Select chosen option in the linked element
                $theirs
                    .prop('selectedIndex', $ours.prop('selectedIndex'));

                $theirs.trigger('change');
            };

            if ($ours.is('input')) {
                $ours.on('change', onInputChange);
            }
            else if ($ours.is('select')) {
                $ours.on('change', onSelectChange);
            }
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

            if (handlers) {
                handlers = handlers.split(' ');

                for (var i = 0, l = handlers.length; i < l; ++i) {
                    var eventName = handlers[i];

                    oculus.setupHandler(eventName, $self, $linked);
                }
            }
            else if (oculus.defaultHandler) {
                oculus.setupHandler(oculus.defaultHandler, $self, $linked);
            }
        });

    };

    Oculus.prototype.addHandler = function(name, handler) {
        this.handlers[name] = handler;
    };

    Oculus.prototype.setupHandler = function(name, $ours, $theirs) {
        if (!this.handlers.hasOwnProperty(name)) {
            throw "Handler with name '" + name + "' not found";
        }

        this.handlers[name]($ours, $theirs);
    };

    return Oculus;
});