// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { Carousel, CarouselPage } from '../../carousel';

test('carousel toplevel properties', () => {
    const carousel = new Carousel();
    expect(carousel.getJsonTypeName()).toBe("Carousel");
    expect(carousel.getItemCount()).toEqual(0);
});
