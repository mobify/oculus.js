/* jslint maxstatements: false */
/*
  Oculus.js
  -------
  Bridging the gap between Adaptive and Desktop.

  TODO:

  - If the original form has validation, the browser freaks out because the
  elements are invisible

*/
 define([
    '$'
],
function($) {
    function Oculus() {
        this.handlers = [];
        this.defaultHandler = null;
    }
    
    function getRandomInt(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    Oculus.getSelectorForElement = function($element) {
        if (!$element.length) {
            return;
        }

        var randomClass = 'js-uuid-' + getRandomInt(10000, 100000);

        $element.addClass(randomClass);

        return '.' + randomClass;
    };

    Oculus.prototype.setDefaultHandler = function(name) {
        this.defaultHandler = name;
    };

    Oculus.prototype.emit = function(event, $ours, $theirs) {
        $ours.trigger($.Event('oculus:' + event, {
            $theirs: $theirs,
            bubbles: false
        }));
    };

    Oculus.prototype.init = function() {
        var oculus = this;

        this.addHandler('visibility', function($ours, $theirs) {
            var update = function() {
                $ours.css('display', $theirs.css('display'));

                /* TODO:
                1. Find a better way to transmit data to consumers
                2. Add emit to the other handlers as well
                */
                oculus.emit('visibility', $ours, $theirs);
            };

            var observer = new MutationObserver(function() {
                // We don't really care what mutation happened, we just want to
                // sync everything in-case
                update();
            });

            observer.observe($theirs[0], { attributes: true, childList: false, characterData: false, subtree: false });

            update();
        });

        // TODO: Get this working for touch events as well
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

                $theirs.prop('disabled', $ours.prop('disabled'));
                $theirs.prop('readonly', $ours.prop('readonly'));

                if ($ours.attr('type') === 'checkbox' || $ours.attr('type') === 'radio') {
                    $theirs.prop('checked', $ours.prop('checked'));
                    $theirs[0].checked = $ours[0].checked;
                }

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
                $theirs.on('change', onTheirInputChange);

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
                $ours.prop('readonly', $theirs.prop('readonly'));

                if ($theirs.is('option')) {
                    $ours.prop('selected', $theirs.prop('selected'));
                }

                if ($theirs.attr('type') === 'checkbox' || $theirs.attr('type') === 'radio') {
                    $ours.prop('checked', $theirs.prop('checked'));
                    $ours[0].checked = $theirs[0].checked;
                }
            };

            if ($ours.is('select')) {
                $ours.html($theirs.html());
            }

            if ($theirs.is('[type="hidden"]')) {
                $ours.hide();
            }

            var observer = new MutationObserver(function() {
                // We don't really care what mutation happened, we just want to sync everything incase
                update();
            });

            observer.observe($theirs[0], { attributes: true, childList: false, characterData: false, subtree: false });

            update();
        });

        this.addHandler('html', function($ours, $theirs) {
            var args = ($ours.attr('data-oculus-handler-args') || '').split(' ');
            var ourHTML = $ours.html();

            var update = function() {
                var theirHTML = $theirs.html();

                if (theirHTML !== ourHTML) {
                    $ours.html(theirHTML);

                    if ($.inArray('strip-style', args) !== null) {
                        $ours.find('[style]').removeAttr('style');
                    }

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
        function initHandlers() {
            $('[data-oculus-element]:not(.js-oculus-setup)').each(function() {
                var $self = $(this);
                var handlers = $self.attr('data-oculus-handlers');
                var element = $self.attr('data-oculus-element');
                var $linked = element;

                $self.addClass('js-oculus-setup');

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

            setTimeout(initHandlers, 50);
        }

        initHandlers();
    };

    Oculus.prototype.addHandler = function(name, handler) {
        this.handlers[name] = handler;
    };

    Oculus.prototype.setupHandler = function(name, $ours, $theirs, callback) {
        if (!this.handlers.hasOwnProperty(name)) {
            console.error("Handler with name '" + name + "' not found", $ours);
            return;
        }

        this.handlers[name]($ours, $theirs, callback);
    };

    return Oculus;
});