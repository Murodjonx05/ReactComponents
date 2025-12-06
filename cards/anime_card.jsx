import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";

// ============================================================================
// DEFAULT STYLES PRESETS
// ============================================================================

export const DEFAULT_STYLES = {
    image: {
        objectFit: "cover",
        upscaleFactor: 1.1,
        hoverFilter: "brightness(1.05)",
    },
    card: {
        background: "glass-10",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
        hoverBoxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        glassmorphism: true,
        minWidth: "250px",
        maxWidth: "400px",
        minHeight: "300px",
        maxHeight: "500px",
        aspectRatio: null,
    },
    animation: {
        enabled: true,
        type: "scale",
        slideY: -8,
        duration: "0.3s",
        timing: "ease",
    },
    overlay: {
        gradient: "black-60",
        padding: "12px 16px",
    },
};

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export const COLOR_PALETTE = {
    white: "255,255,255",
    black: "0,0,0",
    glass: "255,255,255",
    gray: "128,128,128",
    blue: "59,130,246",
    red: "239,68,68",
    green: "34,197,94",
    yellow: "234,179,8",
    purple: "168,85,247",
};

const COLOR_REGEX = /^([a-z]+)-(\d+)$/;
let colorCache = {};

const parseColor = (color) => {
    if (!color) return "transparent";
    if (colorCache[color]) return colorCache[color];

    let result = color;
    const match = color.match(COLOR_REGEX);

    if (match) {
        const [, colorName, alpha] = match;
        const rgb = COLOR_PALETTE[colorName] || COLOR_PALETTE.white;
        result = `rgba(${rgb},${parseInt(alpha, 10) / 100})`;
    }

    if (Object.keys(colorCache).length > 100) colorCache = {};
    colorCache[color] = result;
    return result;
};

// ============================================================================
// UTILITIES
// ============================================================================

const parseValue = (val) => (typeof val === "number" ? val : parseFloat(val) || 0);

const parseRatio = (ratio) => {
    if (typeof ratio === "number") return ratio;
    if (typeof ratio === "string") {
        const trimmed = ratio.trim().replace(/\s+/g, ""); // Remove all whitespace
        if (trimmed.includes("/")) {
            const [w, h] = trimmed.split("/").map(parseFloat);
            return w && h ? w / h : 1;
        }
        return parseFloat(trimmed) || 1;
    }
    return 1;
};

let sizeCache = {};

const calculateSize = (minWidth, maxWidth, minHeight, maxHeight, aspectRatio) => {
    const key = `${minWidth}|${maxWidth}|${minHeight}|${maxHeight}|${aspectRatio || ""}`;
    if (sizeCache[key]) return sizeCache[key];

    const minW = parseValue(minWidth);
    const maxW = parseValue(maxWidth);
    const minH = parseValue(minHeight);
    const maxH = parseValue(maxHeight);

    let result;
    if (aspectRatio) {
        const ratio = parseRatio(aspectRatio);
        const widthFromMinH = minH * ratio;
        const widthFromMaxH = maxH * ratio;
        let finalMin = Math.max(minW, widthFromMinH);
        let finalMax = Math.min(maxW, widthFromMaxH);
        if (finalMin > finalMax) finalMin = finalMax;

        // Start from MAX width to prevent layout shift
        result = {
            width: `${finalMax}px`,
            maxWidth: `${finalMax}px`,
            minWidth: `${finalMin}px`,
            aspectRatio: aspectRatio,
            height: "auto",
        };
    } else {
        // Start from MAX width to prevent layout shift
        result = {
            width: `${maxW}px`,
            maxWidth: `${maxW}px`,
            minWidth: `${minW}px`,
            minHeight: minHeight,
            maxHeight: maxHeight,
        };
    }

    if (Object.keys(sizeCache).length > 50) sizeCache = {};
    sizeCache[key] = result;
    return result;
};

// ============================================================================
// CSS INJECTION
// ============================================================================

const injectStyles = () => {
    if (typeof document === "undefined" || document.getElementById("pc-styles")) return;

    const style = document.createElement("style");
    style.id = "pc-styles";
    style.textContent = `
    @keyframes pcShimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    .pc-shimmer {
      position: absolute;
      inset: 0;
      overflow: hidden;
      pointer-events: none;
      z-index: 0;
    }
    .pc-shimmer::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%);
      animation: pcShimmer 1.5s infinite linear;
      will-change: transform;
    }
    .pc-shimmer-hide {
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s ease-out, visibility 0s 0.2s;
    }
    .pc-img {
      position: relative;
      z-index: 1;
      opacity: 0;
    }
    .pc-img-show {
      opacity: 1;
      transition: opacity 0.2s ease-out;
    }
  `;
    document.head.appendChild(style);
};

injectStyles();

// ============================================================================
// BASE STYLES (minimal defaults)
// ============================================================================

const MINIMAL_STYLES = {
    container: { position: "relative", width: "100%", height: "100%", overflow: "hidden" },
    title: { margin: 0, fontSize: "18px", fontWeight: "bold", color: "white" },
    link: { color: "inherit", textDecoration: "none" },
    overlay: { position: "absolute", bottom: 0, left: 0, right: 0, color: "white" },
};

// ============================================================================
// PRODUCT CARD COMPONENT
// ============================================================================

const ProductCard = React.memo((props) => {
    const {
        product,

        // Style System
        defaultStyles = DEFAULT_STYLES,
        useDefaultStyles = true,

        // Image Props
        imgObjectFit,
        imgUpscaleFactor,
        imgHoverFilter,
        imgStyle,
        imageClassName,

        // Card Props
        cardBackground,
        cardBorderRadius,
        cardBoxShadow,
        cardHoverBoxShadow,
        glassmorphism,
        minWidth,
        maxWidth,
        minHeight,
        maxHeight,
        aspectRatio,
        cardClassName,
        cardStyle,

        // Animation Props
        enableHoverAnimation,
        hoverAnimationType,
        hoverSlideY,
        animationDuration,
        animationTiming,

        // Overlay Props
        overlayGradient,
        overlayPadding,
        overlayClassName,
        overlayStyle,

        // Title Props
        titleStyle,
        titleClassName,
        titleLinkStyle,

        // Container Props
        imageContainerStyle,
    } = props;

    // State
    const [hovered, setHovered] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef(null);

    // Check if image is already cached
    useEffect(() => {
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) setLoaded(true);
    }, []);

    // Event handlers (memoized)
    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);
    const handleImageLoad = useCallback(() => setLoaded(true), []);

    // Simple fallback helper (no nested object access needed)
    const _imgObjectFit = imgObjectFit ?? (useDefaultStyles ? defaultStyles.image.objectFit : "cover");
    const _imgUpscaleFactor = imgUpscaleFactor ?? (useDefaultStyles ? defaultStyles.image.upscaleFactor : 1.1);
    const _imgHoverFilter = imgHoverFilter ?? (useDefaultStyles ? defaultStyles.image.hoverFilter : "brightness(1.05)");
    const _cardBackground = cardBackground ?? (useDefaultStyles ? defaultStyles.card.background : "glass-10");
    const _cardBorderRadius = cardBorderRadius ?? (useDefaultStyles ? defaultStyles.card.borderRadius : "16px");
    const _cardBoxShadow = cardBoxShadow ?? (useDefaultStyles ? defaultStyles.card.boxShadow : "0 8px 32px rgba(0,0,0,0.2)");
    const _cardHoverBoxShadow = cardHoverBoxShadow ?? (useDefaultStyles ? defaultStyles.card.hoverBoxShadow : "0 12px 40px rgba(0,0,0,0.3)");
    const _glassmorphism = glassmorphism ?? (useDefaultStyles ? defaultStyles.card.glassmorphism : true);
    const _minWidth = minWidth ?? (useDefaultStyles ? defaultStyles.card.minWidth : "250px");
    const _maxWidth = maxWidth ?? (useDefaultStyles ? defaultStyles.card.maxWidth : "400px");
    const _minHeight = minHeight ?? (useDefaultStyles ? defaultStyles.card.minHeight : "300px");
    const _maxHeight = maxHeight ?? (useDefaultStyles ? defaultStyles.card.maxHeight : "500px");
    const _aspectRatio = aspectRatio ?? (useDefaultStyles ? defaultStyles.card.aspectRatio : null);
    const _enableHoverAnimation = enableHoverAnimation ?? (useDefaultStyles ? defaultStyles.animation.enabled : true);
    const _hoverAnimationType = hoverAnimationType ?? (useDefaultStyles ? defaultStyles.animation.type : "scale");
    const _hoverSlideY = hoverSlideY ?? (useDefaultStyles ? defaultStyles.animation.slideY : -8);
    const _animationDuration = animationDuration ?? (useDefaultStyles ? defaultStyles.animation.duration : "0.3s");
    const _animationTiming = animationTiming ?? (useDefaultStyles ? defaultStyles.animation.timing : "ease");
    const _overlayGradient = overlayGradient ?? (useDefaultStyles ? defaultStyles.overlay.gradient : "black-60");
    const _overlayPadding = overlayPadding ?? (useDefaultStyles ? defaultStyles.overlay.padding : "12px 16px");

    // Calculate size
    const sizeStyles = useMemo(
        () => calculateSize(_minWidth, _maxWidth, _minHeight, _maxHeight, _aspectRatio),
        [_minWidth, _maxWidth, _minHeight, _maxHeight, _aspectRatio]
    );

    // Parse colors
    const bgColor = useMemo(() => parseColor(_cardBackground), [_cardBackground]);
    const gradientColor = useMemo(() => parseColor(_overlayGradient), [_overlayGradient]);
    const borderColor = useMemo(() => parseColor("white-20"), []);

    // Card styles
    const cardStyles = useMemo(() => {
        const backgroundColor = _glassmorphism ? bgColor : bgColor?.replace(/[\d.]+\)$/, "1)");
        const transform = hovered && _hoverAnimationType === "slide" ? `translateY(${_hoverSlideY}px)` : "none";
        const transition = _enableHoverAnimation
            ? `transform ${_animationDuration} ${_animationTiming}, box-shadow ${_animationDuration} ${_animationTiming}`
            : "none";

        return {
            position: "relative",
            ...sizeStyles,
            borderRadius: _cardBorderRadius,
            overflow: "hidden",
            margin: "16px",
            backgroundColor,
            border: `1px solid ${borderColor}`,
            backdropFilter: _glassmorphism ? "blur(10px)" : "none",
            boxShadow: hovered ? _cardHoverBoxShadow : _cardBoxShadow,
            transition,
            transform,
            ...cardStyle,
        };
    }, [
        sizeStyles,
        _cardBorderRadius,
        bgColor,
        _glassmorphism,
        hovered,
        _cardHoverBoxShadow,
        _cardBoxShadow,
        _enableHoverAnimation,
        _animationDuration,
        _animationTiming,
        _hoverAnimationType,
        _hoverSlideY,
        borderColor,
        cardStyle,
    ]);

    // Image styles
    const imgStyles = useMemo(() => {
        const transition = _enableHoverAnimation
            ? `transform ${_animationDuration} ${_animationTiming}, filter ${_animationDuration} ${_animationTiming}`
            : "none";

        return {
            width: "100%",
            height: "100%",
            objectFit: _imgObjectFit,
            transition,
            transform: hovered ? `scale(${_imgUpscaleFactor})` : "scale(1)",
            filter: hovered ? _imgHoverFilter : "none",
            ...imgStyle,
        };
    }, [_imgObjectFit, _enableHoverAnimation, _animationDuration, _animationTiming, hovered, _imgUpscaleFactor, _imgHoverFilter, imgStyle]);

    // Overlay styles
    const overlayStyles = useMemo(() => {
        return {
            ...MINIMAL_STYLES.overlay,
            background: `linear-gradient(to top, ${gradientColor}, transparent)`,
            padding: _overlayPadding,
            zIndex: 2,
            ...overlayStyle,
        };
    }, [gradientColor, _overlayPadding, overlayStyle]);

    // Title & Link styles
    const h2Style = useMemo(() => ({ ...MINIMAL_STYLES.title, ...titleStyle }), [titleStyle]);
    const linkStyle = useMemo(() => ({ ...MINIMAL_STYLES.link, ...titleLinkStyle }), [titleLinkStyle]);
    const containerStyles = useMemo(() => ({ ...MINIMAL_STYLES.container, ...imageContainerStyle }), [imageContainerStyle]);

    return (
        <div className={cardClassName || ""} style={cardStyles} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div style={containerStyles}>
                <div className={`pc-shimmer${loaded ? " pc-shimmer-hide" : ""}`} style={{ backgroundColor: bgColor }} aria-hidden="true" />
                <img
                    ref={imgRef}
                    className={`pc-img ${imageClassName || ""}${loaded ? " pc-img-show" : ""}`}
                    src={product.image}
                    alt={product.name}
                    style={imgStyles}
                    decoding="async"
                    onLoad={handleImageLoad}
                />
            </div>
            <div className={overlayClassName || ""} style={overlayStyles}>
                <h2 className={titleClassName || ""} style={h2Style}>
                    <a href={product.url || "#"} style={linkStyle}>
                        {product.name}
                    </a>
                </h2>
            </div>
        </div>
    );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;

// ============================================================================
// USAGE EXAMPLES (commented out)
// ============================================================================

/*
// Example 1: Default styles
<ProductCard product={product} />

// Example 2: Custom color palette
export const MY_COLORS = {
  ...COLOR_PALETTE,
  brand: "59,130,246",
  accent: "236,72,153",
};

// Example 3: Custom default styles
const myStyles = {
  image: {
    objectFit: "contain",
    upscaleFactor: 1.2,
    hoverFilter: "brightness(1.1) saturate(1.2)",
  },
  card: {
    background: "rgba(0,0,0,0.5)",
    borderRadius: "24px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    hoverBoxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    glassmorphism: false,
    minWidth: "300px",
    maxWidth: "500px",
    minHeight: "400px",
    maxHeight: "600px",
  },
  animation: {
    enabled: true,
    type: "slide",
    slideY: -12,
    duration: "0.4s",
    timing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
  overlay: {
    gradient: "linear-gradient(to top, rgba(0,0,0,0.9), transparent)",
    padding: "32px 24px",
  },
};

<ProductCard product={product} defaultStyles={myStyles} />

// Example 4: Without any default styles
<ProductCard 
  product={product} 
  useDefaultStyles={false}
  cardBackground="rgba(255,255,255,0.1)"
  cardBorderRadius="12px"
  minWidth="200px"
  maxWidth="350px"
  imgObjectFit="cover"
/>

// Example 5: Mix default styles with overrides
<ProductCard 
  product={product} 
  cardBackground="blue-20"
  imgUpscaleFactor={1.15}
  animationDuration="0.5s"
/>

// Example 6: Complete custom styling
<ProductCard 
  product={product}
  useDefaultStyles={false}
  cardStyle={{
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    borderRadius: '20px',
    border: 'none',
    padding: '20px',
  }}
  imgStyle={{
    borderRadius: '12px',
  }}
  overlayStyle={{
    background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
  }}
/>

// Example 7: Grid layout
const products = [
  { name: "Product 1", image: "...", url: "#" },
  { name: "Product 2", image: "...", url: "#" },
  { name: "Product 3", image: "...", url: "#" },
];

<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
  {products.map((product, i) => (
    <ProductCard key={i} product={product} />
  ))}
</div>

// Example 8: Different animation types
<ProductCard product={product} hoverAnimationType="slide" />
<ProductCard product={product} hoverAnimationType="scale" />

// Example 9: Disable animations
<ProductCard product={product} enableHoverAnimation={false} />

// Example 10: Custom aspect ratio
<ProductCard product={product} aspectRatio="16/9" />
<ProductCard product={product} aspectRatio="1/1" />
<ProductCard product={product} aspectRatio="3/4" />
*/



// My demmo setup
{/* 
    <ProductCard
    // useDefaultStyles={false}
    product={product}

    // === IMG ===
    imgObjectFit="cover"
    imgUpscaleFactor="1.03"


    // === CARD ===
    cardBackground="rgba(0, 0, 0, 0.02)"
    cardBorderRadius="16px"
    cardBoxShadow="0 3px 6px rgba(255, 255, 255, 0.1)"
    cardHoverBoxShadow="0 3px 6px rgba(255, 255, 255, 0.2)"
    minWidth="250px"
    maxWidth="300px"
    maxHeight="570px"
    aspectRatio="3 / 4.7"
    cardStyle={{
        border: "1px solid rgba(255, 255, 255, 0.05)",
    }}



    // === HOVER ===
    hoverAnimationType="fade"
    animationDuration="0.25s"

    // === TITLE ===
    titleStyle={{ color: "white", textTransform: "uppercase" }}

/> */}
