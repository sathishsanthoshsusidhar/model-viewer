/*
 * Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an 'AS IS' BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {property} from 'lit-element';

import ModelViewerElementBase, {$needsRender, $onModelLoad, $scene, $tick, $updateSource} from '../model-viewer-base.js';
import {Constructor} from '../utils.js';

const MILLISECONDS_PER_SECOND = 1000.0

const $changeAnimation = Symbol('changeAnimation');
const $paused = Symbol('paused');

export const AnimationMixin =
    (ModelViewerElement: Constructor<ModelViewerElementBase>):
        Constructor<ModelViewerElementBase> => {
          class AnimationModelViewerElement extends ModelViewerElement {
            @property({type: Boolean}) autoplay: boolean = false;
            @property({type: String, attribute: 'animation-name'})
            animationName: string|void = undefined;
            @property({type: Number, attribute: 'animation-crossfade-duration'})
            animationCrossfadeDuration: number = 300;

            protected[$paused]: boolean = true;

            /**
             * Returns an array
             */
            get availableAnimations(): Array<string> {
              if (this.loaded) {
                return (this as any)[$scene].model.animationNames;
              }

              return [];
            }

            get paused(): boolean {
              return this[$paused];
            }

            get currentTime(): number {
              return (this as any)[$scene].model.animationTime;
            }

            set currentTime(value: number) {
              (this as any)[$scene].model.animationTime = value;
            }

            pause() {
              if (this[$paused]) {
                return;
              }

              this[$paused] = true;
              this.dispatchEvent(new CustomEvent('pause'));
            }

            play() {
              if (this[$paused] && this.availableAnimations.length > 0) {
                this[$paused] = false;

                if (!(this as any)[$scene].model.hasActiveAnimation) {
                  this[$changeAnimation]();
                }

                this.dispatchEvent(new CustomEvent('play'));
              }
            }

            [$onModelLoad]() {
              this[$paused] = true;

              if (this.autoplay) {
                this[$changeAnimation]();
                this.play();
              }
            }

            [$tick](_time: number, delta: number) {
              if (this[$paused]) {
                return;
              }

              const {model} = (this as any)[$scene];
              model.updateAnimation(delta / MILLISECONDS_PER_SECOND);

              this[$needsRender]();
            }

            updated(changedProperties: Map<string, any>) {
              super.updated(changedProperties);

              if (changedProperties.has('autoplay') && this.autoplay) {
                this.play();
              }

              if (changedProperties.has('animationName')) {
                this[$changeAnimation]();
              }
            }

            async[$updateSource]() {
              super[$updateSource]();

              // If we are loading a new model, we need to stop the animation of
              // the current one (if any is playing). Otherwise, we might lose
              // the reference to the scene root and running actions start to
              // throw exceptions and/or behave in unexpected ways:
              (this as any)[$scene].model.stopAnimation();
            }

            [$changeAnimation]() {
              const {model} = (this as any)[$scene];

              model.playAnimation(
                  this.animationName,
                  this.animationCrossfadeDuration / MILLISECONDS_PER_SECOND);

              // If we are currently paused, we need to force a render so that
              // the model updates to the first frame of the new animation
              if (this[$paused]) {
                model.updateAnimation(0);
                this[$needsRender]();
              }
            }
          }

          return AnimationModelViewerElement;
        };
