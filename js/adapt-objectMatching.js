/*
 * adapt-objectMatching
 * License - http://github.com/BATraining/adapt-objectMatching/blob/master/LICENSE
 * Maintainers - Himanshu Rajotia <himanshu.rajotia@exultcorp.com>
 */
define(function(require) {

    var QuestionView = require('coreViews/questionView');
    var Adapt = require('coreJS/adapt');

    var ObjectMatching = QuestionView.extend({

        events: {
            'click .objectMatching-item-draggable': 'onClickDragItem',
            'click .objectMatching-item-droppable': 'onClickDropItem'
        },

        resetQuestionOnRevisit: function() {
            this.resetQuestion();
        },

        setupQuestion: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);
            this.model.set('_currentlySelectedItemId', '');

            // Check if items need to be randomised
            if (this.model.get('_isRandom') && this.model.get('_isEnabled')) {
                this.model.set('_draggableItems', _.shuffle(this.model.get('_draggableItems')));
            }

            if(!this.model.get('_isSubmitted')) {
                this.model.set('_droppableItems', _.shuffle(this.model.get('_droppableItems')));
            }

            _.each(this.model.get("_draggableItems"), function(item, index) {
                item._index = item._index || (index + 1);
            });
        },

        onQuestionRendered: function() {
            if (this.$('.objectMatching-widget').find('img').length > 0) {
                this.$('.objectMatching-widget').imageready(_.bind(function() {
                    this.setReadyStatus();
                }, this));
            } else {
                this.setReadyStatus();
            }

            this.model.set('_initialObjectMatchingWidgetView', this.$('.objectMatching-widget').html());
        },

        setupObjectMatching: function() {
            var draggableItems = this.model.get('_draggableItems');
            _.each(this.$('.objectMatching-item-draggable-index'), function(item, index) {
                $(item).html(draggableItems[index]._index);
            });

            if(this.model.get('_isSubmitted')) {
                this.showMarking();
            }
        },

        reRender: function() {
            if (this.model.get('_wasDragAndDrop') && Adapt.device.screenSize == 'large') {
                this.replaceWithDragAndDrop();
            }
        },

        replaceWithDragAndDrop: function() {
            if (!Adapt.componentStore.dragAndDrop) throw "Drag And Drop not included in build";
            var DragAndDrop = Adapt.componentStore.dragAndDrop;

            var model = this.prepareDragAndDropModel();
            var newDragAndDrop = new DragAndDrop({model: model, $parent: this.options.$parent});
            if(model.get('_initialDragAndDropWidgetView')) {
                newDragAndDrop.$el.find('.dragAndDrop-widget').html(model.get('_initialDragAndDropWidgetView'));
            }
            if(model.get('_isSubmitted')) {
                newDragAndDrop.showMarking();
            }
            this.options.$parent.append(newDragAndDrop.$el);
            this.remove();
            _.defer(function() {
                Adapt.trigger('device:resize');
            });
        },

        prepareDragAndDropModel: function() {
            var model = this.model;
            model.set('_component', 'dragAndDrop');

            return model;
        },

        onClickDragItem: function(event) {
            if (event && event.preventDefault) event.preventDefault();

            if (!this.model.get('_isEnabled')) {
                return false;
            }

            var $selectedElement = this.$(event.currentTarget);
            var $selectedElementContainer = $selectedElement.parent('div');
            var currentlySelectedItemId = $selectedElement.attr('data-id');
            var currentlySelectedItem = _.where(this.model.get('_draggableItems'), {id: currentlySelectedItemId})[0];
            if (currentlySelectedItemId == this.model.get('_currentlySelectedItemId')) {
                $selectedElementContainer
                    .removeClass('selected');
                this.$('.objectMatching-item-droppable').removeClass('cursor-pointer');
                this.model.set('_currentlySelectedItemId', '');
            } else {
                $selectedElementContainer
                    .addClass('selected')
                    .siblings('div')
                    .removeClass('selected');
                this.$('.objectMatching-item-droppable').addClass('cursor-pointer');
                this.model.set('_currentlySelectedItemId', currentlySelectedItem.id);
            }
        },

        onClickDropItem: function(event) {
            if (event && event.preventDefault) event.preventDefault();

            var currentlySelectedItemId = this.model.get('_currentlySelectedItemId');
            if (!this.model.get('_isEnabled') || !currentlySelectedItemId) return false;

            var $selectedElementContainer = this.$(event.currentTarget).closest('.objectMatching-item-droppable');

            var selectedElementId = $selectedElementContainer.attr('data-id');

            var draggableItems = this.model.get('_draggableItems');
            var droppableItems = this.model.get('_droppableItems');
            var selectedItem = _.where(droppableItems, {id: selectedElementId})[0];

            if(selectedItem._selectedItemId && selectedItem._selectedItemId == currentlySelectedItemId) {
                $selectedElementContainer.find('.objectMatching-item-droppable-index').html('');
                $selectedElementContainer.removeClass("selected");
                selectedItem._selectedItemId = null;
            } else {
                var existingSelectedItem = _.where(droppableItems, {_selectedItemId: currentlySelectedItemId})[0];

                if(existingSelectedItem) {
                    this.$('[data-id=' + existingSelectedItem.id + ']')
                        .find('.objectMatching-item-droppable-index').html('');
                    $selectedElementContainer.removeClass("selected");
                    existingSelectedItem._selectedItemId = null;
                }
                $selectedElementContainer
                    .addClass('selected')
                    .siblings('div')
                    .removeClass('selected');
                $selectedElementContainer
                    .find('.objectMatching-item-droppable-index')
                    .html(_.where(draggableItems, {id: currentlySelectedItemId})[0]._index);

                selectedItem._selectedItemId = currentlySelectedItemId;
            }
        },

        canSubmit: function() {
            var count = 0;

            _.each(this.model.get('_droppableItems'), function(item) {
                if (item._selectedItemId) {
                    count++;
                }
            });

            var canSubmit = (count == this.model.get('_droppableItems').length);

            if(canSubmit) {
                this.$('.objectMatching-item-draggable-wrapper').removeClass('selected');
                this.$('.objectMatching-item-droppable').removeClass("selected");
            }

            return canSubmit;
        },

        // Blank method for question to fill out when the question cannot be submitted
        onCannotSubmit: function() {},

        storeUserAnswer: function() {
            var userAnswer = [];
            _.each(this.model.get('_droppableItems'), function(item, index) {
                userAnswer.push(item._selectedItemId);
            }, this);
            this.model.set('_userAnswer', userAnswer);
        },

        isCorrect: function() {
            var numberOfRequiredAnswers = this.model.get('_droppableItems').length;
            var numberOfCorrectAnswers = 0;
            var numberOfIncorrectAnswers = 0;

            _.each(this.model.get('_droppableItems'), function(item, index) {

                // Set item._isSelected to either true or false
                var isCorrect = item.correctItemId === item._selectedItemId;

                if (isCorrect) {
                    // If the item is selected adjust correct answer
                    numberOfCorrectAnswers++;
                    // Set item to correct - is used for returning to this component
                    item._isCorrect = true;
                    // Set that at least one correct answer has been selected
                    // Used in isPartlyCorrect method below
                    this.model.set('_isAtLeastOneCorrectSelection', true);
                }

            }, this);

            this.model.set('_numberOfCorrectAnswers', numberOfCorrectAnswers);

            // Check if correct answers matches correct items and there are no incorrect selections
            var answeredCorrectly = (numberOfCorrectAnswers === numberOfRequiredAnswers) && (numberOfIncorrectAnswers === 0);
            return answeredCorrectly;
        },

        setScore: function() {
            var questionWeight = this.model.get('_questionWeight');
            var answeredCorrectly = this.model.get('_isCorrect');
            var score = answeredCorrectly ? questionWeight : 0;
            this.model.set('_score', score);
        },

        showMarking: function() {
            _.each(this.model.get('_droppableItems'), function(item, i) {

                var $item = this.$('.objectMatching-item-droppable').eq(i);
                $item.addClass(item._isCorrect ? 'correct' : 'incorrect');

            }, this);
        },

        isPartlyCorrect: function() {
            return this.model.get('_isAtLeastOneCorrectSelection');
        },

        resetUserAnswer: function() {
            this.model.set('_userAnswer', []);
        },

        resetQuestion: function() {
            _.each(this.model.get('_droppableItems'), function(item) {
                delete item._selectedItemId;
            });

            this.$('.objectMatching-widget').html(this.model.get('_initialObjectMatchingWidgetView'));

            this.model.set({
                _currentlySelectedItemId: '',
                _isAtLeastOneCorrectSelection: false
            });
        },

        showCorrectAnswer: function() {
            _.each(this.model.get('_droppableItems'), function(item, index) {
                this.setdroppableItems(index, item.correctItemId);
            }, this);
        },

        setdroppableItems: function(droppableContainerIndex, draggableItemId) {

            var $droppableItemContainer = this.$('.objectMatching-item-droppable').eq(droppableContainerIndex);
            var draggableItem = _.where(this.model.get('_draggableItems'), {id: draggableItemId})[0];

            $droppableItemContainer

                .find('.objectMatching-item-droppable-index')
                .html(this.$('.objectMatching-item-draggable').index(this.$('[data-id=' + draggableItem.id + ']')) + 1);
        },

        hideCorrectAnswer: function() {
            _.each(this.model.get('_droppableItems'), function(item, index) {
                this.setdroppableItems(index, this.model.get('_userAnswer')[index]);
            }, this);
        }

    });

    Adapt.register('objectMatching', ObjectMatching);

    return ObjectMatching;

});
