/*
 * adapt-objectMatching
 * Copyright (C) 2015 Bombardier Inc. (www.batraining.com)
 * https://github.com/BATraining/adapt-objectMatching/blob/master/LICENSE
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
define(function(require) {

    var QuestionView = require('coreViews/questionView');
    var Adapt = require('coreJS/adapt');

    var ObjectMatching = QuestionView.extend({

        events: {
            'click .draggable-item': 'onClickDragItem',
            'click .droppable-item': 'onClickDropItem'
        },

        resetQuestionOnRevisit: function() {
            this.resetQuestion();
        },

        setupQuestion: function() {
            this.listenTo(Adapt, 'device:changed', this.reRender, this);
            this.model.set('_currentlySelectedItemId', '');

            this.setupRandomisation();

            _.each(this.model.get("_draggableItems"), function(item, index) {
                item._index = item._index || (index + 1);
            });
        },

        setupRandomisation: function() {
            if (this.model.get('_isRandom') && this.model.get('_isEnabled')) {
                this.model.set('_draggableItems', _.shuffle(this.model.get('_draggableItems')));
            }

            if (!this.model.get('_isSubmitted')) {
                this.model.set('_droppableItems', _.shuffle(this.model.get('_droppableItems')));
            }
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
            _.each(this.$('.draggable-item-index'), function(item, index) {
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
            var newDragAndDrop = new DragAndDrop({model: model});
            var $container = $(".component-container", $("." + this.model.get("_parentId")));

            if(model.get('_initialDragAndDropWidgetView')) {
                newDragAndDrop.$el.find('.dragAndDrop-widget').html(model.get('_initialDragAndDropWidgetView'));
            }
            if(model.get('_isSubmitted')) {
                newDragAndDrop.showMarking();
            }

            $container.append(newDragAndDrop.$el);
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
            var $selectedElementContainer = $selectedElement.closest('.objectMatching-item-wrapper');
            var currentlySelectedItemId = $selectedElement.attr('data-id');
            var currentlySelectedItem = _.where(this.model.get('_draggableItems'), {id: currentlySelectedItemId})[0];

            if (currentlySelectedItemId == this.model.get('_currentlySelectedItemId')) {
                $selectedElementContainer.removeClass('selected');
                this.$('.droppable-item').removeClass('cursor-pointer');
                this.model.set('_currentlySelectedItemId', '');
            } else {
                $selectedElementContainer
                    .addClass('selected')
                    .siblings('div')
                    .removeClass('selected');
                this.$('.droppable-item').addClass('cursor-pointer');
                this.model.set('_currentlySelectedItemId', currentlySelectedItem.id);
            }
        },

        onClickDropItem: function(event) {
            if (event && event.preventDefault) event.preventDefault();

            var currentlySelectedItemId = this.model.get('_currentlySelectedItemId');
            if (!this.model.get('_isEnabled') || !currentlySelectedItemId) return false;

            var $selectedElement = this.$(event.currentTarget);
            var $selectedElementContainer = this.$(event.currentTarget).closest('.objectMatching-item-wrapper');

            var selectedElementId = $selectedElement.attr('data-id');

            var draggableItems = this.model.get('_draggableItems');
            var droppableItems = this.model.get('_droppableItems');
            var selectedItem = _.where(droppableItems, {id: selectedElementId})[0];

            if(selectedItem._selectedItemId && selectedItem._selectedItemId == currentlySelectedItemId) {
                $selectedElementContainer.find('.droppable-item-index').html('');
                $selectedElementContainer.removeClass("selected");
                selectedItem._selectedItemId = null;
            } else {
                var existingSelectedItem = _.where(droppableItems, {_selectedItemId: currentlySelectedItemId})[0];

                if(existingSelectedItem) {
                    this.$('[data-id=' + existingSelectedItem.id + ']')
                        .find('.droppable-item-index').html('');
                    $selectedElementContainer.removeClass("selected");
                    existingSelectedItem._selectedItemId = null;
                }
                $selectedElementContainer
                    .addClass('selected')
                    .siblings('div')
                    .removeClass('selected');
                $selectedElementContainer
                    .find('.droppable-item-index')
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
                this.$('.objectMatching-item-wrapper').removeClass('selected');
                this.$('.droppable-item').removeClass("selected");
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

                var $item = this.$('.droppable-item-wrapper').eq(i);
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

            var $droppableItemContainer = this.$('.droppable-item').eq(droppableContainerIndex);
            var draggableItem = _.where(this.model.get('_draggableItems'), {id: draggableItemId})[0];

            $droppableItemContainer

                .find('.droppable-item-index')
                .html(this.$('.draggable-item').index(this.$('[data-id=' + draggableItem.id + ']')) + 1);
        },

        hideCorrectAnswer: function() {
            _.each(this.model.get('_droppableItems'), function(item, index) {
                this.setdroppableItems(index, this.model.get('_userAnswer')[index]);
            }, this);
        },
        
          /**
        * used by adapt-contrib-spoor to get the user's answers in the format required by the cmi.interactions.n.student_response data field
        * returns the user's answers as a string in the format "1,5,2"
        */
        getResponse:function() {
            var selected = _.where(this.model.get('_items'), {'_isSelected':true});
            var selectedIndexes = _.pluck(selected, '_index');
            console.log("selected",selected);
            console.log("selectedIndexes",selectedIndexes);
            // indexes are 0-based, we need them to be 1-based for cmi.interactions
            for (var i = 0, count = selectedIndexes.length; i < count; i++) {
                selectedIndexes[i]++;
            }
            return selectedIndexes.join(',');
        },

        /**
        * used by adapt-contrib-spoor to get the type of this question in the format required by the cmi.interactions.n.type data field
        */
        getResponseType:function() {
            return "choice";
        }

    });

    Adapt.register('objectMatching', ObjectMatching);

    return ObjectMatching;

});
