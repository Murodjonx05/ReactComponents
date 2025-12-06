import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";

export const DEFAULT_STYLES = {
    image: { objectFit: "cover", upscaleFactor: 1.1, hoverFilter: "brightness(1.05)" },
    card: { background: "glass-10", borderRadius: "16px", boxShadow: "0 8px 32px rgba(0,0,0,0.2)", hoverBoxShadow: "0 12px 40px rgba(0,0,0,0.3)", glassmorphism: true, minWidth: "250px", maxWidth: "400px", minHeight: "300px", maxHeight: "500px", aspectRatio: null },
    animation: { enabled: true, type: "scale", slideY: -8, duration: "0.3s", timing: "ease" },
    overlay: { gradient: "black-60", padding: "12px 16px" },
};

export const COLOR_PALETTE = {
    white: "255,255,255", black: "0,0,0", glass: "255,255,255",
    gray: "128,128,128", blue: "59,130,246", red: "239,68,68",
    green: "34,197,94", yellow: "234,179,8", purple: "168,85,247",
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

const parseValue = (val) => (typeof val === "number" ? val : parseFloat(val) || 0);

const parseRatio = (ratio) => {
    if (typeof ratio === "number") return ratio;
    if (typeof ratio === "string") {
        const trimmed = ratio.trim().replace(/\s+/g, "");
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
    const minW = parseValue(minWidth), maxW = parseValue(maxWidth);
    const minH = parseValue(minHeight), maxH = parseValue(maxHeight);
    let result;
    if (aspectRatio) {
        const ratio = parseRatio(aspectRatio);
        let finalMin = Math.max(minW, minH * ratio);
        let finalMax = Math.min(maxW, maxH * ratio);
        if (finalMin > finalMax) finalMin = finalMax;
        result = { width: `${finalMax}px`, maxWidth: `${finalMax}px`, minWidth: `${finalMin}px`, aspectRatio, height: "auto" };
    } else {
        result = { width: `${maxW}px`, maxWidth: `${maxW}px`, minWidth: `${minW}px`, minHeight, maxHeight };
    }
    if (Object.keys(sizeCache).length > 50) sizeCache = {};
    sizeCache[key] = result;
    return result;
};

const injectStyles = () => {
    if (typeof document === "undefined" || document.getElementById("pc-styles")) return;
    const style = document.createElement("style");
    style.id = "pc-styles";
    style.textContent = `@keyframes pcShimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}.pc-shimmer{position:absolute;inset:0;overflow:hidden;pointer-events:none;z-index:0}.pc-shimmer::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.15) 50%,transparent 100%);animation:pcShimmer 1.5s infinite linear;will-change:transform}.pc-shimmer-hide{opacity:0;visibility:hidden;transition:opacity .2s ease-out,visibility 0s .2s}.pc-img{position:relative;z-index:1;opacity:0}.pc-img-show{opacity:1;transition:opacity .2s ease-out}`;
    document.head.appendChild(style);
};

injectStyles();

const MINIMAL_STYLES = {
    container: { position: "relative", width: "100%", height: "100%", overflow: "hidden" },
    title: { margin: 0, fontSize: "18px", fontWeight: "bold", color: "white" },
    link: { color: "inherit", textDecoration: "none" },
    overlay: { position: "absolute", bottom: 0, left: 0, right: 0, color: "white" },
};

const ProductCard = React.memo((props) => {
    const {
        product, defaultStyles = DEFAULT_STYLES, useDefaultStyles = true,
        imgObjectFit, imgUpscaleFactor, imgHoverFilter, imgStyle, imageClassName,
        cardBackground, cardBorderRadius, cardBoxShadow, cardHoverBoxShadow,
        glassmorphism, minWidth, maxWidth, minHeight, maxHeight, aspectRatio,
        cardClassName, cardStyle, enableHoverAnimation, hoverAnimationType,
        hoverSlideY, animationDuration, animationTiming, overlayGradient,
        overlayPadding, overlayClassName, overlayStyle, titleStyle,
        titleClassName, titleLinkStyle, imageContainerStyle,
    } = props;

    // Guard against null/undefined product
    if (!product) return null;

    const [hovered, setHovered] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        const img = imgRef.current;
        if (img?.complete && img.naturalWidth > 0) setLoaded(true);
    }, []);

    const handleMouseEnter = useCallback(() => setHovered(true), []);
    const handleMouseLeave = useCallback(() => setHovered(false), []);
    const handleImageLoad = useCallback(() => setLoaded(true), []);
    const handleImageError = useCallback(() => setLoaded(true), []); // Hide shimmer on error too

    const d = useDefaultStyles ? defaultStyles : {};
    const _imgObjectFit = imgObjectFit ?? (d.image?.objectFit ?? "cover");
    const _imgUpscaleFactor = imgUpscaleFactor ?? (d.image?.upscaleFactor ?? 1.1);
    const _imgHoverFilter = imgHoverFilter ?? (d.image?.hoverFilter ?? "brightness(1.05)");
    const _cardBackground = cardBackground ?? (d.card?.background ?? "glass-10");
    const _cardBorderRadius = cardBorderRadius ?? (d.card?.borderRadius ?? "16px");
    const _cardBoxShadow = cardBoxShadow ?? (d.card?.boxShadow ?? "0 8px 32px rgba(0,0,0,0.2)");
    const _cardHoverBoxShadow = cardHoverBoxShadow ?? (d.card?.hoverBoxShadow ?? "0 12px 40px rgba(0,0,0,0.3)");
    const _glassmorphism = glassmorphism ?? (d.card?.glassmorphism ?? true);
    const _minWidth = minWidth ?? (d.card?.minWidth ?? "250px");
    const _maxWidth = maxWidth ?? (d.card?.maxWidth ?? "400px");
    const _minHeight = minHeight ?? (d.card?.minHeight ?? "300px");
    const _maxHeight = maxHeight ?? (d.card?.maxHeight ?? "500px");
    const _aspectRatio = aspectRatio ?? (d.card?.aspectRatio ?? null);
    const _enableHoverAnimation = enableHoverAnimation ?? (d.animation?.enabled ?? true);
    const _hoverAnimationType = hoverAnimationType ?? (d.animation?.type ?? "scale");
    const _hoverSlideY = hoverSlideY ?? (d.animation?.slideY ?? -8);
    const _animationDuration = animationDuration ?? (d.animation?.duration ?? "0.3s");
    const _animationTiming = animationTiming ?? (d.animation?.timing ?? "ease");
    const _overlayGradient = overlayGradient ?? (d.overlay?.gradient ?? "black-60");
    const _overlayPadding = overlayPadding ?? (d.overlay?.padding ?? "12px 16px");

    const sizeStyles = useMemo(() => calculateSize(_minWidth, _maxWidth, _minHeight, _maxHeight, _aspectRatio), [_minWidth, _maxWidth, _minHeight, _maxHeight, _aspectRatio]);
    const bgColor = useMemo(() => parseColor(_cardBackground), [_cardBackground]);
    const gradientColor = useMemo(() => parseColor(_overlayGradient), [_overlayGradient]);
    const borderColor = useMemo(() => parseColor("white-20"), []);

    const cardStyles = useMemo(() => {
        const backgroundColor = _glassmorphism ? bgColor : bgColor?.replace(/[\d.]+\)$/, "1)");
        const transform = hovered && _hoverAnimationType === "slide" ? `translateY(${_hoverSlideY}px)` : "none";
        const transition = _enableHoverAnimation ? `transform ${_animationDuration} ${_animationTiming}, box-shadow ${_animationDuration} ${_animationTiming}` : "none";
        return {
            position: "relative", ...sizeStyles, borderRadius: _cardBorderRadius, overflow: "hidden",
            margin: "16px", backgroundColor, border: `1px solid ${borderColor}`,
            backdropFilter: _glassmorphism ? "blur(10px)" : "none",
            boxShadow: hovered ? _cardHoverBoxShadow : _cardBoxShadow, transition, transform, ...cardStyle,
        };
    }, [sizeStyles, _cardBorderRadius, bgColor, _glassmorphism, hovered, _cardHoverBoxShadow, _cardBoxShadow, _enableHoverAnimation, _animationDuration, _animationTiming, _hoverAnimationType, _hoverSlideY, borderColor, cardStyle]);

    const imgStyles = useMemo(() => {
        const transition = _enableHoverAnimation ? `transform ${_animationDuration} ${_animationTiming}, filter ${_animationDuration} ${_animationTiming}` : "none";
        return {
            width: "100%", height: "100%", objectFit: _imgObjectFit, transition,
            transform: hovered ? `scale(${parseFloat(_imgUpscaleFactor) || 1.1})` : "scale(1)",
            filter: hovered ? _imgHoverFilter : "none", ...imgStyle,
        };
    }, [_imgObjectFit, _enableHoverAnimation, _animationDuration, _animationTiming, hovered, _imgUpscaleFactor, _imgHoverFilter, imgStyle]);

    const overlayStyles = useMemo(() => ({
        ...MINIMAL_STYLES.overlay, background: `linear-gradient(to top, ${gradientColor}, transparent)`,
        padding: _overlayPadding, zIndex: 2, ...overlayStyle,
    }), [gradientColor, _overlayPadding, overlayStyle]);

    const h2Style = useMemo(() => ({ ...MINIMAL_STYLES.title, ...titleStyle }), [titleStyle]);
    const linkStyle = useMemo(() => ({ ...MINIMAL_STYLES.link, ...titleLinkStyle }), [titleLinkStyle]);
    const containerStyles = useMemo(() => ({ ...MINIMAL_STYLES.container, ...imageContainerStyle }), [imageContainerStyle]);

    return (
        <div className={cardClassName || ""} style={cardStyles} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <div style={containerStyles}>
                <div className={`pc-shimmer${loaded ? " pc-shimmer-hide" : ""}`} style={{ backgroundColor: bgColor }} aria-hidden="true" />
                <img ref={imgRef} className={`pc-img ${imageClassName || ""}${loaded ? " pc-img-show" : ""}`} src={product.image} alt={product.name} style={imgStyles} decoding="async" onLoad={handleImageLoad} onError={handleImageError} />
            </div>
            <div className={overlayClassName || ""} style={overlayStyles}>
                <h2 className={titleClassName || ""} style={h2Style}>
                    <a href={product.url || "#"} style={linkStyle}>{product.name}</a>
                </h2>
            </div>
        </div>
    );
});

ProductCard.displayName = "ProductCard";

export default ProductCard;

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
