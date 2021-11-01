// Copyright (C) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { CardElement, Container, ContainerBase, SerializationContext, ShowCardAction, ToggleVisibilityAction } from "./card-elements";
import { NumProperty, property, PropertyBag, Versions } from "./serialization";
import { GlobalRegistry } from "./registry";
import { TypeErrorType, ValidationEvent } from "./enums";
import { Strings } from "./strings";
import { Swiper, A11y, Autoplay, History, Keyboard, Navigation, Pagination, Scrollbar, SwiperOptions } from "swiper";
import * as Utils from "./utils";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { GlobalSettings } from "./shared";

// TODO - investigate/wrap
Swiper.use([
    Navigation,
    Pagination,
    Scrollbar,
    A11y,
    History,
    Keyboard,
    Autoplay
]);

export class CarouselPage extends Container {
    //#region Schema

    //#endregion

    protected internalRender(): HTMLElement | undefined {

        let swiperSlide: HTMLElement = document.createElement("div");
        swiperSlide.className = this.hostConfig.makeCssClassName("swiper-slide");

        let renderedElement = super.internalRender();
        Utils.appendChild(swiperSlide, renderedElement);
        return swiperSlide;
    }
    static readonly unsupportedElements = [
        ShowCardAction.JsonTypeName,
        ToggleVisibilityAction.JsonTypeName,
        "Media",
        "ActionSet",
        "TextInput",
        "DateInput",
        "TimeInput",
        "NumberInput",
        "ChoiceSetInput",
        "ToggleInput"
    ];


    protected internalParse(source: any, context: SerializationContext) {
        super.internalParse(source, context);

        this.setShouldFallback(false);
    }

    protected shouldSerialize(context: SerializationContext): boolean {
        return true;
    }

    getJsonTypeName(): string {
        return "CarouselPage";
    }

    get isStandalone(): boolean {
        return false;
    }
}

export class Carousel extends ContainerBase {
    //#region Schema

    static readonly timerProperty = new NumProperty(Versions.v1_6, "timer", 0);
    @property(Carousel.timerProperty)
    get timer(): number | undefined {
        let timer = this.getValue(Carousel.timerProperty);

        if (timer && timer < this.hostConfig.carousel.minAutoplayDelay) {
            console.warn(Strings.errors.tooLittleTimeDelay);
            timer = this.hostConfig.carousel.minAutoplayDelay;
        }

        return timer;
    }

    set timer(value: number | undefined) {
        if (value && value < this.hostConfig.carousel.minAutoplayDelay) {
                console.warn(Strings.errors.tooLittleTimeDelay);
                this.timer = this.hostConfig.carousel.minAutoplayDelay;
        }
        else {
            this.timer = value;
        }
    }

    //#endregion

    private _pages: CarouselPage[] = [];
    private _renderedPages: CarouselPage[];

    getJsonTypeName(): string {
        return "Carousel";
    }

    getItemCount(): number {
        return this._pages.length;
    }

    getPageAt(index: number): CarouselPage {
        return this._pages[index];
    }

    getItemAt(index: number): CardElement {
        return this.getPageAt(index);
    }

    removeItem(item: CardElement): boolean {
        if (item instanceof CarouselPage) {
            const itemIndex = this._pages.indexOf(item);

            if (itemIndex >= 0) {
                this._pages.splice(itemIndex, 1);

                item.setParent(undefined);

                this.updateLayout();

                return true;
            }
        }

        return false;
    }

    getFirstVisibleRenderedItem(): CardElement | undefined {
        if (this.renderedElement && this._renderedPages?.length > 0) {
            return this._renderedPages[0];
        }
        else {
            return undefined;
        }
    }

    getLastVisibleRenderedItem(): CardElement | undefined {
        if (this.renderedElement && this._renderedPages?.length > 0) {
            return this._renderedPages[this._renderedPages.length - 1];
        }
        else {
            return undefined;
        }
    }

    protected internalParse(source: any, context: SerializationContext) {
        super.internalParse(source, context);

        this._pages = [];
        this._renderedPages = [];

        const jsonPages = source["pages"];
        if (Array.isArray(jsonPages)) {
            for (const item of jsonPages) {
                const page = this.createCarouselPageInstance(item, context);
                if (page) {
                    this._pages.push(page);
                }
            }
        }
    }

    protected internalToJSON(target: PropertyBag, context: SerializationContext) {
        super.internalToJSON(target, context);

        context.serializeArray(target, "pages", this._pages);
    }

    protected internalRender(): HTMLElement | undefined {
        this._renderedPages = [];

        if (this._pages.length <= 0) {
            return undefined;
        }

        const cardLevelContainer: HTMLElement = document.createElement("div");

        const swiperContainer: HTMLElement = document.createElement("div");
        swiperContainer.classList.add(this.hostConfig.makeCssClassName("swiper"));

        const swiperWrapper: HTMLElement = document.createElement("div");
        swiperWrapper.className = this.hostConfig.makeCssClassName("swiper-wrapper");
        swiperWrapper.style.display = "flex";
        //swiperWrapper.style.flexDirection = "column";

        if (GlobalSettings.useAdvancedCardBottomTruncation) {
            // Forces the container to be at least as tall as its content.
            //
            // Fixes a quirk in Chrome where, for nested flex elements, the
            // inner element's height would never exceed the outer element's
            // height. This caused overflow truncation to break -- containers
            // would always be measured as not overflowing, since their heights
            // were constrained by their parents as opposed to truly reflecting
            // the height of their content.
            //
            // See the "Browser Rendering Notes" section of this answer:
            // https://stackoverflow.com/questions/36247140/why-doesnt-flex-item-shrink-past-content-size
            swiperWrapper.style.minHeight = '-webkit-min-content';
        }

        // switch (this.getEffectiveVerticalContentAlignment()) {
        //     case VerticalAlignment.Center:
        //         swiperWrapper.style.justifyContent = "center";
        //         break;
        //     case VerticalAlignment.Bottom:
        //         swiperWrapper.style.justifyContent = "flex-end";
        //         break;
        //     default:
        //         swiperWrapper.style.justifyContent = "flex-start";
        //         break;
        // }

        for (const page of this._pages) {
            const renderedItem = this.isElementAllowed(page) ? page.render() : undefined;
            if (renderedItem) {
                Utils.appendChild(swiperWrapper, renderedItem);
                this._renderedPages.push(page);
            }
        }

        swiperContainer.appendChild(swiperWrapper as HTMLElement);

        const prevElementDiv: HTMLElement = document.createElement("button");
        prevElementDiv.classList.add("swiper-button-prev");
        swiperContainer.appendChild(prevElementDiv);

        const nextElementDiv: HTMLElement = document.createElement("button");
        nextElementDiv.classList.add("swiper-button-next");
        swiperContainer.appendChild(nextElementDiv);

        const pagination: HTMLElement = document.createElement("div");
        pagination.classList.add("swiper-pagination");
        swiperContainer.appendChild(pagination);

        this.initializeSwiper(swiperContainer, nextElementDiv, prevElementDiv, pagination);

        cardLevelContainer.appendChild(swiperContainer);
        return this._renderedPages.length > 0 ? cardLevelContainer : undefined;
    }

    private initializeSwiper(swiperContainer: HTMLElement, nextElement: HTMLElement, prevElement: HTMLElement, paginationElement: HTMLElement): void {
        const swiperOptions: SwiperOptions = {
            loop: true,
            pagination: {
                el: paginationElement
            },
            navigation: {
                prevEl: prevElement,
                nextEl: nextElement
            },
            a11y: {
                enabled: true
            },
            keyboard: {
                enabled: true,
                onlyInViewport: true
            }
        };

        if (this.timer && !this.isDesignMode()) {
            swiperOptions.autoplay = { delay: this.timer };
        }

        new Swiper(swiperContainer, swiperOptions);
    }

    private createCarouselPageInstance(source: any, context: SerializationContext): CarouselPage | undefined {
        return context.parseCardObject<CarouselPage>(
            this,
            source,
            CarouselPage.unsupportedElements,
            !this.isDesignMode(),
            (typeName: string) => {
                return !typeName || typeName === "CarouselPage" ? new CarouselPage() : undefined;
            },
            (typeName: string, errorType: TypeErrorType) => {
                context.logParseEvent(
                    undefined,
                    ValidationEvent.ElementTypeNotAllowed,
                    Strings.errors.elementTypeNotAllowed(typeName));
            }
        )
    }
}

GlobalRegistry.singletonElements.register("Carousel", Carousel, Versions.v1_6);
